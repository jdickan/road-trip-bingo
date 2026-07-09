import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createHash } from "node:crypto";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db, pool, boardsTable } from "@workspace/db";
import app from "../app";
import { truncateAll } from "./helpers";

beforeEach(async () => {
  await truncateAll();
  delete process.env.PUBLIC_API_KEY;
});

afterAll(async () => {
  delete process.env.PUBLIC_API_KEY;
  await pool.end();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// NOTE: the global bingo_content_version_seq is NOT reset by truncateAll, so
// tests never assert absolute version values — only relative ordering.

async function createBoard(name: string, extra: Record<string, unknown> = {}) {
  const res = await request(app)
    .post("/api/boards")
    .send({ name, ...extra })
    .expect(201);
  return res.body.id as number;
}

async function publishBoard(id: number) {
  await request(app).patch(`/api/boards/${id}`).send({ published: true }).expect(200);
}

async function createWord(word: string, boardIds: number[] = []) {
  const res = await request(app)
    .post("/api/words")
    .send({ word, boardIds })
    .expect(201);
  return res.body.id as number;
}

async function getVersion(boardId: number): Promise<number> {
  const [row] = await db
    .select({ v: boardsTable.contentVersion })
    .from(boardsTable)
    .where(eq(boardsTable.id, boardId));
  return row!.v;
}

// ---------------------------------------------------------------------------
// GET /api/v1/boards
// ---------------------------------------------------------------------------

describe("GET /api/v1/boards", () => {
  it("lists only published boards", async () => {
    const pubId = await createBoard("Published board");
    await createBoard("Draft board");
    await publishBoard(pubId);

    const res = await request(app).get("/api/v1/boards").expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.boards).toHaveLength(1);
    expect(res.body.boards[0].id).toBe(pubId);
    expect(res.body.boards[0].contentVersion).toBeGreaterThan(0);
    expect(res.body.boards[0].wordCount).toBe(0);
  });

  it("supports since-based delta sync and reports global latestVersion", async () => {
    const aId = await createBoard("Board A");
    const bId = await createBoard("Board B");
    await publishBoard(aId);
    await publishBoard(bId);

    const vA = await getVersion(aId);
    const vB = await getVersion(bId);
    expect(vB).toBeGreaterThan(vA);

    // since=vA → only B changed after that cursor
    const delta = await request(app).get(`/api/v1/boards?since=${vA}`).expect(200);
    expect(delta.body.total).toBe(1);
    expect(delta.body.boards[0].id).toBe(bId);
    // latestVersion spans ALL published boards regardless of the filter
    expect(delta.body.latestVersion).toBe(vB);

    // fully caught up → empty list, same cursor
    const upToDate = await request(app).get(`/api/v1/boards?since=${vB}`).expect(200);
    expect(upToDate.body.total).toBe(0);
    expect(upToDate.body.latestVersion).toBe(vB);
  });

  it("returns latestVersion 0 when nothing is published", async () => {
    await createBoard("Draft only");
    const res = await request(app).get("/api/v1/boards").expect(200);
    expect(res.body).toEqual({ boards: [], total: 0, latestVersion: 0 });
  });

  it("rejects a negative since", async () => {
    await request(app).get("/api/v1/boards?since=-1").expect(400);
  });

  it("counts only non-deleted words", async () => {
    const boardId = await createBoard("Counting");
    await publishBoard(boardId);
    await createWord("Cow", [boardId]);
    const doomedId = await createWord("Ghost", [boardId]);
    await request(app).delete(`/api/words/${doomedId}`).expect(204);

    const res = await request(app).get("/api/v1/boards").expect(200);
    expect(res.body.boards[0].wordCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/boards/:id/bundle
// ---------------------------------------------------------------------------

describe("GET /api/v1/boards/:id/bundle", () => {
  it("returns board metadata, words sorted by id, and a verifiable checksum", async () => {
    const boardId = await createBoard("Bundle board", {
      description: "desc",
      ageLevels: ["Kid"],
      difficulty: "Easy",
    });
    await publishBoard(boardId);
    await createWord("Zebra", [boardId]);
    await createWord("Apple", [boardId]);

    const res = await request(app).get(`/api/v1/boards/${boardId}/bundle`).expect(200);

    expect(res.body.board.id).toBe(boardId);
    expect(res.body.board.wordCount).toBe(2);
    expect(res.body.contentVersion).toBe(res.body.board.contentVersion);

    // Sorted by id, NOT alphabetically
    const ids = res.body.words.map((w: { id: number }) => w.id);
    expect(ids).toEqual([...ids].sort((a: number, b: number) => a - b));

    // Checksum is reproducible from the canonical word list JSON
    const expected =
      "sha256:" +
      createHash("sha256").update(JSON.stringify(res.body.words)).digest("hex");
    expect(res.body.checksum).toBe(expected);

    // Bundle words carry gameplay fields only — no editorial fields
    expect(res.body.words[0]).not.toHaveProperty("notes");
    expect(res.body.words[0]).not.toHaveProperty("boards");
  });

  it("excludes soft-deleted words from the bundle", async () => {
    const boardId = await createBoard("Deletions");
    await publishBoard(boardId);
    await createWord("Keep", [boardId]);
    const goneId = await createWord("Gone", [boardId]);

    const before = await request(app).get(`/api/v1/boards/${boardId}/bundle`).expect(200);
    expect(before.body.words).toHaveLength(2);

    await request(app).delete(`/api/words/${goneId}`).expect(204);

    const after = await request(app).get(`/api/v1/boards/${boardId}/bundle`).expect(200);
    expect(after.body.words).toHaveLength(1);
    expect(after.body.words[0].word).toBe("Keep");
    expect(after.body.checksum).not.toBe(before.body.checksum);
  });

  it("returns 404 for unpublished and nonexistent boards alike", async () => {
    const draftId = await createBoard("Secret draft");
    const draft = await request(app).get(`/api/v1/boards/${draftId}/bundle`).expect(404);
    const missing = await request(app).get("/api/v1/boards/999999/bundle").expect(404);
    // Same body — existence of unpublished boards must not leak
    expect(draft.body).toEqual(missing.body);
  });

  it("returns 400 for a non-numeric id", async () => {
    await request(app).get("/api/v1/boards/abc/bundle").expect(400);
  });
});

// ---------------------------------------------------------------------------
// contentVersion bump rules
// ---------------------------------------------------------------------------

describe("contentVersion bumps", () => {
  it("bumps on publish, not on republish no-op, and preserves publishedAt on republish", async () => {
    const boardId = await createBoard("Publish me");
    expect(await getVersion(boardId)).toBe(0);

    await publishBoard(boardId);
    const v1 = await getVersion(boardId);
    expect(v1).toBeGreaterThan(0);

    const first = await request(app).get(`/api/boards/${boardId}`).expect(200);

    // Republish no-op: no bump, publishedAt unchanged
    await request(app).patch(`/api/boards/${boardId}`).send({ published: true }).expect(200);
    expect(await getVersion(boardId)).toBe(v1);
    const second = await request(app).get(`/api/boards/${boardId}`).expect(200);
    expect(second.body.publishedAt).toBe(first.body.publishedAt);
  });

  it("bumps on bundle-visible metadata edits of a published board only", async () => {
    const boardId = await createBoard("Meta board");
    await publishBoard(boardId);
    const v1 = await getVersion(boardId);

    // Editorial-only fields: no bump
    await request(app)
      .patch(`/api/boards/${boardId}`)
      .send({ notes: "internal", status: "active", availability: "Free" })
      .expect(200);
    expect(await getVersion(boardId)).toBe(v1);

    // Bundle-visible field: bump
    await request(app).patch(`/api/boards/${boardId}`).send({ name: "Renamed" }).expect(200);
    expect(await getVersion(boardId)).toBeGreaterThan(v1);
  });

  it("does not bump unpublished boards on metadata or word edits", async () => {
    const boardId = await createBoard("Never published");
    const wordId = await createWord("Cloud", [boardId]);

    await request(app).patch(`/api/boards/${boardId}`).send({ name: "Still draft" }).expect(200);
    await request(app).patch(`/api/words/${wordId}`).send({ word: "Clouds" }).expect(200);
    await request(app).delete(`/api/words/${wordId}`).expect(204);

    expect(await getVersion(boardId)).toBe(0);
  });

  it("bumps linked published boards on word content edits but not notes-only edits", async () => {
    const boardId = await createBoard("Words board");
    await publishBoard(boardId);
    const wordId = await createWord("Tractor", [boardId]);
    const v1 = await getVersion(boardId);
    expect(v1).toBeGreaterThan(0); // word creation bumped

    await request(app).patch(`/api/words/${wordId}`).send({ notes: "editorial" }).expect(200);
    expect(await getVersion(boardId)).toBe(v1);

    await request(app).patch(`/api/words/${wordId}`).send({ spanish: "Tractor" }).expect(200);
    expect(await getVersion(boardId)).toBeGreaterThan(v1);
  });

  it("bumps both old and new boards when word membership changes", async () => {
    const aId = await createBoard("From board");
    const bId = await createBoard("To board");
    await publishBoard(aId);
    await publishBoard(bId);
    const wordId = await createWord("Mover", [aId]);
    const vA = await getVersion(aId);
    const vB = await getVersion(bId);

    await request(app).patch(`/api/words/${wordId}`).send({ boardIds: [bId] }).expect(200);

    // The board the word LEFT must also re-version
    expect(await getVersion(aId)).toBeGreaterThan(vA);
    expect(await getVersion(bId)).toBeGreaterThan(vB);
  });

  it("bumps on soft delete, restore, and bulk operations", async () => {
    const boardId = await createBoard("Lifecycle");
    await publishBoard(boardId);
    const w1 = await createWord("One", [boardId]);
    const w2 = await createWord("Two", [boardId]);

    let prev = await getVersion(boardId);

    await request(app).delete(`/api/words/${w1}`).expect(204);
    let cur = await getVersion(boardId);
    expect(cur).toBeGreaterThan(prev);
    prev = cur;

    await request(app).post(`/api/words/${w1}/restore`).expect(200);
    cur = await getVersion(boardId);
    expect(cur).toBeGreaterThan(prev);
    prev = cur;

    await request(app).post("/api/words/bulk-delete").send({ ids: [w1, w2] }).expect(200);
    cur = await getVersion(boardId);
    expect(cur).toBeGreaterThan(prev);
    prev = cur;

    await request(app).post("/api/words/bulk-restore").send({ ids: [w1, w2] }).expect(200);
    cur = await getVersion(boardId);
    expect(cur).toBeGreaterThan(prev);
  });
});

// ---------------------------------------------------------------------------
// API key guard on /api/v1/*
// ---------------------------------------------------------------------------

describe("public API key guard", () => {
  it("is open when PUBLIC_API_KEY is unset outside production", async () => {
    await request(app).get("/api/v1/boards").expect(200);
  });

  it("enforces X-API-Key when PUBLIC_API_KEY is set", async () => {
    process.env.PUBLIC_API_KEY = "test-key-123";
    try {
      const missing = await request(app).get("/api/v1/boards").expect(401);
      expect(missing.body.error).toBe("API key required.");

      const wrong = await request(app)
        .get("/api/v1/boards")
        .set("X-API-Key", "wrong-key-000")
        .expect(401);
      expect(wrong.body.error).toBe("Invalid API key.");

      await request(app)
        .get("/api/v1/boards")
        .set("X-API-Key", "test-key-123")
        .expect(200);
    } finally {
      delete process.env.PUBLIC_API_KEY;
    }
  });

  it("does not gate admin routes with the public API key", async () => {
    process.env.PUBLIC_API_KEY = "test-key-123";
    try {
      // Admin route: unaffected by PUBLIC_API_KEY (auth disabled in tests)
      await request(app).get("/api/boards").expect(200);
    } finally {
      delete process.env.PUBLIC_API_KEY;
    }
  });
});

// ---------------------------------------------------------------------------
// Read-only guarantee
// ---------------------------------------------------------------------------

describe("v1 namespace is read-only", () => {
  it("has no mutation routes", async () => {
    const boardId = await createBoard("RO board");
    await publishBoard(boardId);

    await request(app).post("/api/v1/boards").send({ name: "nope" }).expect(404);
    await request(app).patch(`/api/v1/boards/${boardId}`).send({ name: "nope" }).expect(404);
    await request(app).delete(`/api/v1/boards/${boardId}`).expect(404);
    await request(app).post(`/api/v1/boards/${boardId}/bundle`).expect(404);
  });
});

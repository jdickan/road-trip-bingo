import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import os from "node:os";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { db, pool, wordsTable, wordBoardsTable, boardsTable } from "@workspace/db";
import type { SnapshotMeta } from "../lib/snapshot-store";

const mocks = vi.hoisted(() => ({
  complete: vi.fn(),
  snapshots: new Map<string, { meta: SnapshotMeta; sql: string }>(),
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: { chat: { completions: { create: mocks.complete } } },
}));
vi.mock("../lib/snapshot-store", async () => {
  const actual = await vi.importActual<typeof import("../lib/snapshot-store")>("../lib/snapshot-store");
  return {
    ...actual,
    saveSnapshot: async (file: string, meta: SnapshotMeta) => {
      mocks.snapshots.set(meta.id, { meta, sql: await fs.readFile(file, "utf8") });
      return meta;
    },
    readSnapshot: async (id: string) => {
      const snapshot = mocks.snapshots.get(id);
      if (!snapshot) throw new actual.SnapshotStoreError("Snapshot not found.", 404);
      return snapshot;
    },
    listSnapshots: async () => [...mocks.snapshots.values()].map(s => s.meta),
    snapshotCreationCapacity: async () => 25 * 1024 * 1024,
    openSnapshotDownload: async (id: string) => {
      const snapshot = mocks.snapshots.get(id);
      if (!snapshot) throw new actual.SnapshotStoreError("Snapshot not found.", 404);
      return { meta: snapshot.meta, stream: Readable.from([Buffer.from(snapshot.sql)]) };
    },
    deleteSnapshot: async (id: string) => { mocks.snapshots.delete(id); },
  };
});

import app from "../app";
import { truncateAll, seedBoards } from "./helpers";
import { resetSnapshotLimitsForTests } from "../lib/snapshot-limits";
import { dumpSnapshot } from "../lib/snapshot-dump";

function answer(rows: unknown[]) {
  return { choices: [{ message: { content: JSON.stringify(rows) } }] };
}

async function word(name: string, boardIds: number[] = [], extra: Record<string, unknown> = {}) {
  const response = await request(app).post("/api/words").send({ word: name, boardIds, ...extra }).expect(201);
  return response.body.id as number;
}

async function snapshot() {
  const response = await request(app).post("/api/snapshots").send({ label: "Safety fixture" }).expect(200);
  return response.body.snapshot.id as string;
}

async function boardVersion(id: number) {
  const [board] = await db.select().from(boardsTable).where(eq(boardsTable.id, id));
  return board!.contentVersion;
}

async function removeFaultTrigger() {
  await db.execute(sql`DROP TRIGGER IF EXISTS safety_autofill_failure ON bingo_words`);
  await db.execute(sql`DROP FUNCTION IF EXISTS safety_autofill_failure()`);
}

beforeEach(async () => {
  resetSnapshotLimitsForTests();
  await removeFaultTrigger();
  await truncateAll();
  mocks.snapshots.clear();
  mocks.complete.mockReset();
});
afterEach(removeFaultTrigger);
afterAll(async () => { await pool.end(); });

describe("atomic snapshot restore", () => {
  it("kills an oversized dump before its temporary file can exceed the allowed bytes", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-dump-limit-test-"));
    const file = path.join(directory, "dump.sql");
    try {
      await expect(dumpSnapshot(file, process.env.DATABASE_URL!, 1)).rejects.toMatchObject({ status: 413 });
      expect((await fs.stat(file)).size).toBeLessThanOrEqual(1);
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
  });

  it("restores exact board IDs after a rename and bumps published versions", async () => {
    const ids = await seedBoards(["Original"]);
    const boardId = ids.get("Original")!;
    await request(app).patch(`/api/boards/${boardId}`).send({ published: true }).expect(200);
    const id = await word("Cow", [boardId]);
    const saved = await snapshot();
    await request(app).patch(`/api/boards/${boardId}`).send({ name: "Renamed" }).expect(200);
    await request(app).patch(`/api/words/${id}`).send({ word: "Edited" }).expect(200);
    await word("Added later");
    const before = await boardVersion(boardId);
    const restored = await request(app).post(`/api/snapshots/${saved}/restore`).expect(200);
    expect(restored.body.snapshot.wordCount).toBe(1);
    const words = await request(app).get("/api/words").expect(200);
    expect(words.body.words).toHaveLength(1);
    expect(words.body.words[0]).toMatchObject({ word: "Cow", boards: ["Renamed"], boardIds: [boardId] });
    expect(await boardVersion(boardId)).toBeGreaterThan(before);
  });

  it("rolls back words, links, versions and ID restart when SQL import fails", async () => {
    const boardId = (await seedBoards(["General"])).get("General")!;
    await request(app).patch(`/api/boards/${boardId}`).send({ published: true }).expect(200);
    await word("Saved", [boardId]);
    const saved = await snapshot();
    const latestId = await word("Keep this", [boardId]);
    const beforeWords = await db.select().from(wordsTable);
    const beforeLinks = await db.select().from(wordBoardsTable);
    const version = await boardVersion(boardId);
    mocks.snapshots.get(saved)!.sql += "\nSELECT safety_nonexistent_function();\n";
    const response = await request(app).post(`/api/snapshots/${saved}/restore`).expect(500);
    expect(response.body.error).toContain("preserved");
    expect(await db.select().from(wordsTable)).toEqual(beforeWords);
    expect(await db.select().from(wordBoardsTable)).toEqual(beforeLinks);
    expect(await boardVersion(boardId)).toBe(version);
    expect(await word("Next")).toBe(latestId + 1);
  });

  it("rejects a missing saved board instead of attaching to a reused name", async () => {
    const oldId = (await seedBoards(["Same name"])).get("Same name")!;
    await word("Saved", [oldId]);
    const saved = await snapshot();
    await request(app).delete(`/api/boards/${oldId}`).expect(204);
    const newId = (await seedBoards(["Same name"])).get("Same name")!;
    await word("Keep current", [newId]);
    const beforeWords = await db.select().from(wordsTable);
    const beforeLinks = await db.select().from(wordBoardsTable);
    await request(app).post(`/api/snapshots/${saved}/restore`).expect(500);
    expect(await db.select().from(wordsTable)).toEqual(beforeWords);
    expect(await db.select().from(wordBoardsTable)).toEqual(beforeLinks);
  });

  it("accepts a modern dump whose saved junction is genuinely empty", async () => {
    await word("No board");
    const saved = await snapshot();
    await word("Later");
    await request(app).post(`/api/snapshots/${saved}/restore`).expect(200);
    expect(await db.select().from(wordsTable)).toHaveLength(1);
    expect(await db.select().from(wordBoardsTable)).toHaveLength(0);
  });

  it("refuses unsafe legacy snapshots before any database changes", async () => {
    await word("Keep this");
    const saved = await snapshot();
    mocks.snapshots.get(saved)!.sql = "COPY public.bingo_words (id, word) FROM stdin;\n1\tLegacy\n\\.\n";
    mocks.snapshots.get(saved)!.meta.sizeBytes = Buffer.byteLength(mocks.snapshots.get(saved)!.sql);
    const before = await db.select().from(wordsTable);
    const response = await request(app).post(`/api/snapshots/${saved}/restore`).expect(409);
    expect(response.body.error).toContain("no saved board links");
    expect(await db.select().from(wordsTable)).toEqual(before);
    await request(app).get(`/api/snapshots/${saved}/download`).expect(200);
  });
});

describe("safe AI autofill", () => {
  it("fills only missing fields, preserving reviewed tags and memberships", async () => {
    const ids = await seedBoards(["General", "Other"]);
    const general = ids.get("General")!;
    const id = await word("Cow", [general], { age: "Tween", findability: "Low", regions: ["NE"] });
    mocks.complete.mockResolvedValue(answer([{
      id, age: "Young", findability: "High", regions: ["All"], surroundings: ["Rural / Xurban"], boards: ["Other"],
    }]));
    const response = await request(app).post("/api/ai/autofill").send({
      fields: ["age", "findability", "regions", "surroundings", "boards"],
    }).expect(200);
    expect(response.body.updated).toBe(1);
    expect(response.body.results[0]).toMatchObject({
      age: "Tween", findability: "Low", regions: ["NE"], surroundings: ["Rural / Xurban"], boardIds: [general],
    });
    const prompt = mocks.complete.mock.calls[0]![0].messages[1].content as string;
    expect(prompt).toContain('"missingFields"');
  });

  it("excludes Trash from both global and explicit-ID autofill", async () => {
    const deleted = await word("Deleted");
    await request(app).delete(`/api/words/${deleted}`).expect(204);
    const active = await word("Active");
    mocks.complete.mockResolvedValue(answer([{ id: active, age: "Kid" }, { id: deleted, age: "Tween" }]));
    await request(app).post("/api/ai/autofill").send({ fields: ["age"] }).expect(200);
    const response = await request(app).post("/api/ai/autofill").send({
      wordIds: [deleted], fields: ["age"],
    }).expect(200);
    expect(response.body.updated).toBe(0);
    expect(mocks.complete).toHaveBeenCalledTimes(1);
    const [trash] = await db.select().from(wordsTable).where(eq(wordsTable.id, deleted));
    expect(trash!.age).toBeNull();
    expect(trash!.deletedAt).not.toBeNull();
  });

  it("deduplicates board names and rejects contradictory All/specific tags", async () => {
    const general = (await seedBoards(["General"])).get("General")!;
    const id = await word("Cow", [], { regions: [] });
    mocks.complete.mockResolvedValue(answer([{
      id, age: "Kid", boards: ["General", "General"], regions: ["All", "NE"],
    }]));
    const response = await request(app).post("/api/ai/autofill").send({
      fields: ["age", "boards", "regions"],
    }).expect(200);
    expect(response.body.updated).toBe(1);
    expect(response.body.results[0]).toMatchObject({ age: "Kid", regions: [], boardIds: [general] });
    expect(await db.select().from(wordBoardsTable)).toHaveLength(1);
  });

  it("does not report a null AI answer as a filled field", async () => {
    const id = await word("Unknown");
    const before = await db.select().from(wordsTable);
    mocks.complete.mockResolvedValue(answer([{ id, age: null }]));
    const response = await request(app).post("/api/ai/autofill").send({ fields: ["age"] }).expect(200);
    expect(response.body.updated).toBe(0);
    expect(await db.select().from(wordsTable)).toEqual(before);
  });

  it("skips manual edits made during model latency", async () => {
    const id = await word("Cow");
    mocks.complete.mockImplementationOnce(async () => {
      await request(app).patch(`/api/words/${id}`).send({ age: "Tween" }).expect(200);
      return answer([{ id, age: "Young" }]);
    });
    const response = await request(app).post("/api/ai/autofill").send({ fields: ["age"] }).expect(200);
    expect(response.body.updated).toBe(0);
    const [current] = await db.select().from(wordsTable).where(eq(wordsTable.id, id));
    expect(current!.age).toBe("Tween");
  });

  it("skips words deleted while the model was processing", async () => {
    const id = await word("Cow");
    mocks.complete.mockImplementationOnce(async () => {
      await request(app).delete(`/api/words/${id}`).expect(204);
      return answer([{ id, age: "Young" }]);
    });
    const response = await request(app).post("/api/ai/autofill").send({ fields: ["age"] }).expect(200);
    expect(response.body.updated).toBe(0);
    const [current] = await db.select().from(wordsTable).where(eq(wordsTable.id, id));
    expect(current!.age).toBeNull();
    expect(current!.deletedAt).not.toBeNull();
  });

  it("rolls back the entire batch and its version bumps if a later update fails", async () => {
    const general = (await seedBoards(["General"])).get("General")!;
    await request(app).patch(`/api/boards/${general}`).send({ published: true }).expect(200);
    const first = await word("First", [general]);
    const second = await word("Second", [general]);
    const version = await boardVersion(general);
    await db.execute(sql`
      CREATE FUNCTION safety_autofill_failure() RETURNS trigger AS $$
      BEGIN
        IF NEW.word = 'Second' AND NEW.age IS NOT NULL THEN RAISE EXCEPTION 'Injected safety-test failure'; END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      CREATE TRIGGER safety_autofill_failure BEFORE UPDATE ON bingo_words
      FOR EACH ROW EXECUTE FUNCTION safety_autofill_failure();
    `);
    mocks.complete.mockResolvedValue(answer([{ id: first, age: "Kid" }, { id: second, age: "Tween" }]));
    const response = await request(app).post("/api/ai/autofill").send({ fields: ["age"] }).expect(500);
    expect(response.body.error).toContain("No changes");
    expect((await db.select().from(wordsTable)).every(w => w.age === null)).toBe(true);
    expect(await boardVersion(general)).toBe(version);
  });
});
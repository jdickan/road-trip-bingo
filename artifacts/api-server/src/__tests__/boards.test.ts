import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { pool } from "@workspace/db";
import app from "../app";
import { truncateAll } from "./helpers";

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await pool.end();
});

describe("boards CRUD", () => {
  it("creates a board", async () => {
    const res = await request(app)
      .post("/api/boards")
      .send({ name: "Christmas", description: "Holiday board" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Christmas");
    expect(res.body.description).toBe("Holiday board");
  });

  it("rejects a board without a name", async () => {
    const res = await request(app).post("/api/boards").send({});
    expect(res.status).toBe(400);
  });

  it("lists boards with total", async () => {
    await request(app).post("/api/boards").send({ name: "A" }).expect(201);
    await request(app).post("/api/boards").send({ name: "B" }).expect(201);

    const res = await request(app).get("/api/boards");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.boards).toHaveLength(2);
  });

  it("updates a board", async () => {
    const created = await request(app)
      .post("/api/boards")
      .send({ name: "Draft board", status: "draft" })
      .expect(201);

    const patched = await request(app)
      .patch(`/api/boards/${created.body.id}`)
      .send({ name: "Active board", status: "active" });

    expect(patched.status).toBe(200);
    expect(patched.body.name).toBe("Active board");
    expect(patched.body.status).toBe("active");
  });

  it("deletes a board", async () => {
    const created = await request(app)
      .post("/api/boards")
      .send({ name: "Doomed" })
      .expect(201);

    await request(app).delete(`/api/boards/${created.body.id}`).expect(204);

    const list = await request(app).get("/api/boards");
    expect(list.body.total).toBe(0);
  });
});

describe("board wordCount (junction-based)", () => {
  it("counts words per board via the junction table", async () => {
    const board = await request(app)
      .post("/api/boards")
      .send({ name: "General" })
      .expect(201);
    const boardId = board.body.id;

    await request(app)
      .post("/api/words")
      .send({ word: "Cow", boardIds: [boardId] })
      .expect(201);
    await request(app)
      .post("/api/words")
      .send({ word: "Barn", boardIds: [boardId] })
      .expect(201);
    await request(app).post("/api/words").send({ word: "Unassigned" }).expect(201);

    const res = await request(app).get("/api/boards");
    const general = res.body.boards.find(
      (b: { id: number }) => b.id === boardId,
    );
    expect(general.wordCount).toBe(2);
  });

  it("excludes soft-deleted words from wordCount", async () => {
    const board = await request(app)
      .post("/api/boards")
      .send({ name: "General" })
      .expect(201);
    const boardId = board.body.id;

    const cow = await request(app)
      .post("/api/words")
      .send({ word: "Cow", boardIds: [boardId] })
      .expect(201);
    await request(app)
      .post("/api/words")
      .send({ word: "Barn", boardIds: [boardId] })
      .expect(201);

    await request(app).delete(`/api/words/${cow.body.id}`).expect(204);

    const res = await request(app).get("/api/boards");
    const general = res.body.boards.find(
      (b: { id: number }) => b.id === boardId,
    );
    expect(general.wordCount).toBe(1);
  });

  it("publishes and unpublishes a board via PATCH", async () => {
    const created = await request(app)
      .post("/api/boards")
      .send({ name: "Releasable" })
      .expect(201);
    expect(created.body.published).toBe(false);
    expect(created.body.publishedAt).toBeNull();

    const published = await request(app)
      .patch(`/api/boards/${created.body.id}`)
      .send({ published: true });
    expect(published.status).toBe(200);
    expect(published.body.published).toBe(true);
    expect(published.body.publishedAt).not.toBeNull();

    const unpublished = await request(app)
      .patch(`/api/boards/${created.body.id}`)
      .send({ published: false });
    expect(unpublished.body.published).toBe(false);
    expect(unpublished.body.publishedAt).toBeNull();
  });

  it("published is independent of lifecycle status", async () => {
    const created = await request(app)
      .post("/api/boards")
      .send({ name: "Concept but published", status: "concept", published: true })
      .expect(201);
    expect(created.body.status).toBe("concept");
    expect(created.body.published).toBe(true);

    const patched = await request(app)
      .patch(`/api/boards/${created.body.id}`)
      .send({ status: "active" });
    expect(patched.body.status).toBe("active");
    expect(patched.body.published).toBe(true);
  });

  it("returns coverage and a deterministic preview in the list", async () => {
    const board = await request(app)
      .post("/api/boards")
      .send({ name: "Sparse" })
      .expect(201);
    const boardId = board.body.id;

    const empty = await request(app).get("/api/boards");
    const sparse = empty.body.boards.find((b: { id: number }) => b.id === boardId);
    expect(sparse.coverage).toEqual({ status: "needs-words", label: "No words yet" });
    expect(sparse.preview).toEqual([]);

    await request(app)
      .post("/api/words")
      .send({ word: "Cow", emoji: "🐄", boardIds: [boardId] })
      .expect(201);
    await request(app)
      .post("/api/words")
      .send({ word: "Barn", boardIds: [boardId] })
      .expect(201);

    const first = await request(app).get("/api/boards");
    const withWords = first.body.boards.find((b: { id: number }) => b.id === boardId);
    expect(withWords.coverage.status).toBe("needs-words");
    expect(withWords.coverage.label).toBe("Needs more words (2/25)");
    expect(withWords.preview).toHaveLength(2);
    expect(withWords.preview[0]).toHaveProperty("word");
    expect(withWords.preview[0]).toHaveProperty("emoji");

    // Preview is deterministic across refetches
    const second = await request(app).get("/api/boards");
    const again = second.body.boards.find((b: { id: number }) => b.id === boardId);
    expect(again.preview).toEqual(withWords.preview);
  });

  it("deleting a board cascades junction rows and clears word associations", async () => {
    const board = await request(app)
      .post("/api/boards")
      .send({ name: "Ephemeral" })
      .expect(201);
    const boardId = board.body.id;

    const word = await request(app)
      .post("/api/words")
      .send({ word: "Cow", boardIds: [boardId] })
      .expect(201);

    await request(app).delete(`/api/boards/${boardId}`).expect(204);

    const got = await request(app).get(`/api/words/${word.body.id}`);
    expect(got.status).toBe(200);
    expect(got.body.boardIds).toEqual([]);
  });
});

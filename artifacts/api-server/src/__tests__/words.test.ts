import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { pool } from "@workspace/db";
import app from "../app";
import { truncateAll, seedBoards } from "./helpers";

let boardIds: Map<string, number>;

beforeEach(async () => {
  await truncateAll();
  boardIds = await seedBoards(["General", "Chaos"]);
});

afterAll(async () => {
  await pool.end();
});

describe("words CRUD", () => {
  it("creates a word with boardIds and returns both boards and boardIds", async () => {
    const generalId = boardIds.get("General")!;
    const res = await request(app)
      .post("/api/words")
      .send({ word: "Cow", spanish: "Vaca", boardIds: [generalId] });

    expect(res.status).toBe(201);
    expect(res.body.word).toBe("Cow");
    expect(res.body.boardIds).toEqual([generalId]);
    expect(res.body.boards).toEqual(["General"]);
  });

  it("lists words with total", async () => {
    await request(app).post("/api/words").send({ word: "Cow" }).expect(201);
    await request(app).post("/api/words").send({ word: "Barn" }).expect(201);

    const res = await request(app).get("/api/words");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.words).toHaveLength(2);
  });

  it("filters words by boardId (junction-based)", async () => {
    const generalId = boardIds.get("General")!;
    const chaosId = boardIds.get("Chaos")!;
    await request(app)
      .post("/api/words")
      .send({ word: "Cow", boardIds: [generalId] })
      .expect(201);
    await request(app)
      .post("/api/words")
      .send({ word: "Alien", boardIds: [chaosId] })
      .expect(201);
    await request(app)
      .post("/api/words")
      .send({ word: "Both", boardIds: [generalId, chaosId] })
      .expect(201);

    const general = await request(app).get(`/api/words?boardId=${generalId}`);
    expect(general.status).toBe(200);
    expect(general.body.total).toBe(2);
    expect(general.body.words.map((w: { word: string }) => w.word).sort()).toEqual([
      "Both",
      "Cow",
    ]);

    const chaos = await request(app).get(`/api/words?boardId=${chaosId}`);
    expect(chaos.body.total).toBe(2);

    const multi = await request(app).get(
      `/api/words?boardId=${generalId},${chaosId}`,
    );
    expect(multi.body.total).toBe(3);
  });

  it("gets a single word by id", async () => {
    const created = await request(app)
      .post("/api/words")
      .send({ word: "Cow" })
      .expect(201);

    const res = await request(app).get(`/api/words/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.word).toBe("Cow");
  });

  it("updates a word's boardIds and rewrites the junction", async () => {
    const generalId = boardIds.get("General")!;
    const chaosId = boardIds.get("Chaos")!;
    const created = await request(app)
      .post("/api/words")
      .send({ word: "Cow", boardIds: [generalId] })
      .expect(201);

    const patched = await request(app)
      .patch(`/api/words/${created.body.id}`)
      .send({ boardIds: [chaosId] });

    expect(patched.status).toBe(200);
    expect(patched.body.boardIds).toEqual([chaosId]);
    expect(patched.body.boards).toEqual(["Chaos"]);

    // Junction reflected in filters
    const general = await request(app).get(`/api/words?boardId=${generalId}`);
    expect(general.body.total).toBe(0);
    const chaos = await request(app).get(`/api/words?boardId=${chaosId}`);
    expect(chaos.body.total).toBe(1);
  });

  it("rejects boardIds that do not exist", async () => {
    const res = await request(app)
      .post("/api/words")
      .send({ word: "Ghost", boardIds: [99999] });
    expect(res.status).toBe(400);
  });

  it("soft-deletes a word and excludes it from the list", async () => {
    const created = await request(app)
      .post("/api/words")
      .send({ word: "Cow" })
      .expect(201);

    await request(app).delete(`/api/words/${created.body.id}`).expect(204);

    const list = await request(app).get("/api/words");
    expect(list.body.total).toBe(0);

    const deleted = await request(app).get("/api/words/deleted");
    expect(deleted.status).toBe(200);
    expect(deleted.body.words).toHaveLength(1);
    expect(deleted.body.words[0].word).toBe("Cow");
  });

  it("returns 404 when deleting a nonexistent word", async () => {
    await request(app).delete("/api/words/99999").expect(404);
  });
});

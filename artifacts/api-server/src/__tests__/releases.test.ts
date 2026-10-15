import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { pool } from "@workspace/db";
import app from "../app";
import { truncateAll } from "./helpers";

afterAll(async () => { await pool.end(); });
beforeEach(async () => { delete process.env.PUBLIC_API_KEY; await truncateAll(); });

async function seedPlayableBoard(name: string) {
  const { body: board } = await request(app).post("/api/boards").send({ name }).expect(201);
  for (let i = 0; i < 25; i++) {
    await request(app).post("/api/words")
      .send({ word: `${name} word ${i}`, boardIds: [board.id] }).expect(201);
  }
  return board.id as number;
}

describe("approved board release lifecycle", () => {
  it("does not publish drafts; freezes previewed metadata and words; withdraws and rolls back at higher versions", async () => {
    const id = await seedPlayableBoard("Draft trip");
    const initialCatalog = await request(app).get("/api/v2/boards").expect(200);
    expect(initialCatalog.body.boards).toEqual([]);

    const preview = await request(app).get(`/api/release/boards/${id}/preview`).expect(200);
    expect(preview.body.validationError).toBeNull();
    const release = await request(app).post(`/api/release/boards/${id}/publish`)
      .send({ checksum: preview.body.checksum }).expect(201);
    expect(release.body.payload.board.name).toBe("Draft trip");
    expect(release.body.version).toBeGreaterThan(initialCatalog.body.latestVersion);

    const oldBundle = await request(app).get(`/api/v2/boards/${id}/bundle`).expect(200);
    expect(oldBundle.body.words).toHaveLength(25);
    expect(oldBundle.body.checksum).toBe(preview.body.checksum);

    await request(app).patch(`/api/boards/${id}`).send({ name: "Edited working copy" }).expect(200);
    const unchanged = await request(app).get(`/api/v2/boards/${id}/bundle`).expect(200);
    expect(unchanged.body.board.name).toBe("Draft trip");
    const changedPreview = await request(app).get(`/api/release/boards/${id}/preview`).expect(200);
    await request(app).post(`/api/release/boards/${id}/publish`)
      .send({ checksum: changedPreview.body.checksum }).expect(201);
    expect((await request(app).get(`/api/v2/boards/${id}/bundle`).expect(200)).body.board.name)
      .toBe("Edited working copy");

    const currentVersion = (await request(app).get("/api/v2/boards").expect(200)).body.latestVersion as number;
    await request(app).post(`/api/release/boards/${id}/withdraw`).expect(204);
    const delta = await request(app).get(`/api/v2/boards?since=${currentVersion}`).expect(200);
    expect(delta.body.boards).toEqual([expect.objectContaining({ id, action: "withdraw" })]);
    await request(app).get(`/api/v2/boards/${id}/bundle`).expect(404);
    await request(app).get(`/api/v2/boards/${id}/releases/${currentVersion - 1}`).expect(404);

    const history = await request(app).get(`/api/release/boards/${id}/history`).expect(200);
    const priorRelease = history.body.releases[0];
    const rollback = await request(app).post(`/api/release/boards/${id}/publish`)
      .send({ checksum: priorRelease.checksum, sourceReleaseId: priorRelease.id }).expect(201);
    expect(rollback.body.version).toBeGreaterThan(currentVersion);
    expect((await request(app).get(`/api/v2/boards/${id}/bundle`).expect(200)).body.board.name)
      .toBe("Edited working copy");
  });

  it("rejects approval if the working draft changes after preview", async () => {
    const id = await seedPlayableBoard("Preview first");
    const preview = await request(app).get(`/api/release/boards/${id}/preview`).expect(200);
    await request(app).patch(`/api/boards/${id}`).send({ name: "Changed after preview" }).expect(200);
    await request(app).post(`/api/release/boards/${id}/publish`)
      .send({ checksum: preview.body.checksum }).expect(409);
  });

  it("gates the public v2 catalog with the API key but leaves editorial routes behind editor auth", async () => {
    process.env.PUBLIC_API_KEY = "release-test-key";
    try {
      await request(app).get("/api/v2/boards").expect(401);
      await request(app).get("/api/v2/boards").set("X-API-Key", "wrong-key").expect(401);
      await request(app).get("/api/v2/boards").set("X-API-Key", "release-test-key").expect(200);
      // The key does not authorize or gate an administrative release preview.
      const id = await seedPlayableBoard("Private release");
      await request(app).get(`/api/release/boards/${id}/preview`)
        .set("X-API-Key", "release-test-key").expect(200);
    } finally {
      delete process.env.PUBLIC_API_KEY;
    }
  });

  it("serializes concurrent release publication into a usable advancing global cursor", async () => {
    const [a, b] = await Promise.all([seedPlayableBoard("Concurrent A"), seedPlayableBoard("Concurrent B")]);
    const [pa, pb] = await Promise.all([
      request(app).get(`/api/release/boards/${a}/preview`),
      request(app).get(`/api/release/boards/${b}/preview`),
    ]);
    const results = await Promise.all([
      request(app).post(`/api/release/boards/${a}/publish`).send({ checksum: pa.body.checksum }),
      request(app).post(`/api/release/boards/${b}/publish`).send({ checksum: pb.body.checksum }),
    ]);
    expect(results.map(r => r.status).sort()).toEqual([201, 201]);
    const versions = results.map(r => r.body.version).sort((x, y) => x - y);
    expect(versions[1]).toBe(versions[0]! + 1);
    const delta = await request(app).get(`/api/v2/boards?since=${versions[0]! - 1}`).expect(200);
    expect(delta.body.boards.map((x: { contentVersion: number }) => x.contentVersion).sort()).toEqual(versions);
    expect(delta.body.latestVersion).toBe(versions[1]);
  });
});

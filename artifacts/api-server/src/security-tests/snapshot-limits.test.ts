import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  snapshotCapacity, SnapshotByteLimit, MAX_SNAPSHOT_BYTES, MAX_SNAPSHOTS,
  MAX_SNAPSHOT_STORAGE_BYTES,
} from "../lib/snapshot-policy";

const database = vi.hoisted(() => ({
  acquired: true,
  query: vi.fn(),
  release: vi.fn(),
  connect: vi.fn(),
}));
vi.mock("@workspace/db", () => ({ pool: { connect: database.connect } }));

import {
  snapshotCreateLimit, snapshotRestoreLimit, snapshotDownloadLimit, snapshotMutationGlobalLimit,
  acquireSnapshotMutation, acquireSnapshotDownload, resetSnapshotLimitsForTests,
} from "../lib/snapshot-limits";

beforeEach(() => {
  resetSnapshotLimitsForTests();
  database.acquired = true;
  database.query.mockReset().mockImplementation(async (text: string) =>
    ({ rows: [{ acquired: text.includes("try") ? database.acquired : true }] }));
  database.release.mockReset();
  database.connect.mockReset().mockResolvedValue({ query: database.query, release: database.release });
});

describe("snapshot abuse controls", () => {
  it("rejects count and aggregate-storage overflow without evicting backups", () => {
    expect(() => snapshotCapacity(Array.from({ length: MAX_SNAPSHOTS }, () => ({ sizeBytes: 1 })))).toThrow("storage limit");
    expect(() => snapshotCapacity([{ sizeBytes: MAX_SNAPSHOT_STORAGE_BYTES }])).toThrow("storage limit");
    expect(snapshotCapacity([{ sizeBytes: MAX_SNAPSHOT_STORAGE_BYTES - 7 }])).toBe(7);
    expect(snapshotCapacity([])).toBe(MAX_SNAPSHOT_BYTES);
  });

  it("blocks a third create request and supplies a retry interval", async () => {
    const app = express().post("/", snapshotCreateLimit, (_req, res) => res.sendStatus(204));
    await request(app).post("/").expect(204);
    await request(app).post("/").expect(204);
    const response = await request(app).post("/").expect(429);
    expect(Number(response.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("allows only one restore per ten-minute window", async () => {
    const app = express().post("/", snapshotRestoreLimit, (_req, res) => res.sendStatus(204));
    await request(app).post("/").expect(204);
    await request(app).post("/").expect(429);
  });

  it("limits downloads independently", async () => {
    const app = express().get("/", snapshotDownloadLimit, (_req, res) => res.sendStatus(204));
    for (let i = 0; i < 10; i++) await request(app).get("/").expect(204);
    await request(app).get("/").expect(429);
  });

  it("applies a process-wide mutation budget independent of client IP", async () => {
    const app = express();
    app.set("trust proxy", 1);
    app.post("/", snapshotMutationGlobalLimit, (_req, res) => res.sendStatus(204));
    for (let i = 0; i < 4; i++) await request(app).post("/").set("X-Forwarded-For", `192.0.2.${i + 1}`).expect(204);
    await request(app).post("/").set("X-Forwarded-For", "192.0.2.100").expect(429);
  });

  it("serializes expensive work locally and releases the database lease", async () => {
    const release = await acquireSnapshotMutation();
    await expect(acquireSnapshotMutation()).rejects.toMatchObject({ status: 429 });
    expect(database.connect).toHaveBeenCalledTimes(1);
    await release();
    expect(database.query).toHaveBeenLastCalledWith("SELECT pg_advisory_unlock(740075)");
    expect(database.release).toHaveBeenCalledWith();
    await (await acquireSnapshotMutation())();
  });

  it("rejects another instance's database lease without retaining a connection", async () => {
    database.acquired = false;
    await expect(acquireSnapshotMutation()).rejects.toMatchObject({ status: 429 });
    expect(database.release).toHaveBeenCalledWith(true);
    database.acquired = true;
    await (await acquireSnapshotMutation())();
  });

  it("destroys a connection if its advisory lock cannot be released", async () => {
    const release = await acquireSnapshotMutation();
    database.query.mockRejectedValueOnce(new Error("Disconnected"));
    await release();
    expect(database.release).toHaveBeenCalledWith(true);
    await (await acquireSnapshotMutation())();
  });

  it("bounds simultaneous downloads and frees slots after completion", () => {
    const first = acquireSnapshotDownload();
    const second = acquireSnapshotDownload();
    expect(acquireSnapshotDownload).toThrow("downloads");
    first();
    const third = acquireSnapshotDownload();
    second();
    third();
  });

  it("rejects oversize chunks before writing any of their bytes", async () => {
    let written = 0;
    await expect(pipeline(Readable.from([Buffer.alloc(9)]), new SnapshotByteLimit(8), new Writable({
      write(chunk: Buffer, _encoding, callback) { written += chunk.length; callback(); },
    }))).rejects.toMatchObject({ status: 413 });
    expect(written).toBe(0);
  });

  it("closes the source when a download client disconnects", async () => {
    const source = Readable.from([Buffer.alloc(4), Buffer.alloc(4)]);
    await expect(pipeline(source, new SnapshotByteLimit(8), new Writable({
      write(_chunk, _encoding, callback) { callback(new Error("Client disconnected")); },
    }))).rejects.toThrow("Client disconnected");
    expect(source.destroyed).toBe(true);
  });
});
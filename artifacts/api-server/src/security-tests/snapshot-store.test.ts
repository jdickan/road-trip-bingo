import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable, Writable } from "node:stream";

const cloud = vi.hoisted(() => ({
  files: new Map<string, Buffer>(),
  sizes: new Map<string, number>(),
  failMetadata: false,
}));

vi.mock("../lib/objectStorage", () => {
  function file(name: string) {
    return {
      name,
      get metadata() { return { size: String(cloud.sizes.get(name) ?? cloud.files.get(name)?.length ?? 0) }; },
      exists: async () => [cloud.files.has(name)],
      createReadStream: () => Readable.from((async function* () {
        const value = cloud.files.get(name);
        if (!value) throw Object.assign(new Error("Not found"), { code: 404 });
        yield value;
      })()),
      createWriteStream: (options?: { preconditionOpts?: { ifGenerationMatch: number } }) => {
        const chunks: Buffer[] = [];
        return new Writable({
          write(chunk: Buffer, _encoding, callback) {
            if (options?.preconditionOpts?.ifGenerationMatch === 0 && cloud.files.has(name)) {
              callback(Object.assign(new Error("Already exists"), { code: 412 }));
            } else { chunks.push(chunk); callback(); }
          },
          final(callback) { cloud.files.set(name, Buffer.concat(chunks)); callback(); },
        });
      },
      save: async (data: string | Buffer, options?: { preconditionOpts?: { ifGenerationMatch: number } }) => {
        if (cloud.failMetadata && name.endsWith(".meta.json")) throw new Error("Injected storage failure");
        if (options?.preconditionOpts?.ifGenerationMatch === 0 && cloud.files.has(name)) {
          throw Object.assign(new Error("Already exists"), { code: 412 });
        }
        cloud.files.set(name, Buffer.from(data));
      },
      download: async () => {
        const value = cloud.files.get(name);
        if (!value) throw Object.assign(new Error("Not found"), { code: 404 });
        return [value];
      },
      delete: async () => { cloud.files.delete(name); },
    };
  }
  return { objectStorageClient: { bucket: () => ({
    file,
    getFiles: async ({ prefix }: { prefix: string }) => [
      [...cloud.files.keys()].filter(name => name.startsWith(prefix)).map(file),
    ],
  }) } };
});

import { listSnapshots, saveSnapshot, readSnapshot, deleteSnapshot, openSnapshotDownload, snapshotCreationCapacity } from "../lib/snapshot-store";
import { MAX_SNAPSHOT_BYTES, MAX_METADATA_BYTES, MAX_SNAPSHOT_STORAGE_BYTES } from "../lib/snapshot-policy";

let temporary: string;
const id = "snap_123";
const dump = "COPY public.bingo_word_boards (word_id, board_id) FROM stdin;\n\\.\n";
const meta = { id, label: "Fixture", createdAt: "2026-10-04T12:00:00.000Z", wordCount: 0, sizeBytes: Buffer.byteLength(dump) };

beforeEach(async () => {
  cloud.files.clear();
  cloud.sizes.clear();
  cloud.failMetadata = false;
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-storage-test-"));
  vi.spyOn(process, "cwd").mockReturnValue(temporary);
  vi.stubEnv("PRIVATE_OBJECT_DIR", "/fixture-bucket/.private");
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await fs.rm(temporary, { recursive: true, force: true });
});

async function save() {
  const file = path.join(temporary, "dump.sql");
  await fs.writeFile(file, dump);
  return saveSnapshot(file, meta);
}

describe("private persistent snapshots", () => {
  it("keeps backups readable after their local temporary files disappear", async () => {
    const saved = await save();
    await fs.unlink(path.join(temporary, "dump.sql"));
    expect((await readSnapshot(id)).sql).toBe(dump);
    expect(await listSnapshots()).toEqual([saved]);
    expect([...cloud.files.keys()].every(name => name.startsWith(".private/bingo-snapshots/"))).toBe(true);
  });

  it("does not expose a partially uploaded backup", async () => {
    cloud.failMetadata = true;
    await expect(save()).rejects.toThrow("Injected storage failure");
    expect(await listSnapshots()).toEqual([]);
    expect(cloud.files.size).toBe(0);
  });

  it("detects changed SQL bytes before they can be restored", async () => {
    await save();
    const key = `.private/bingo-snapshots/${id}.sql`;
    cloud.files.set(key, Buffer.from(dump.replace("COPY", "copy")));
    await expect(readSnapshot(id)).rejects.toThrow("integrity check failed");
    // Corruption must not prevent an editor from deleting an unusable backup.
    await deleteSnapshot(id);
    expect(await listSnapshots()).toEqual([]);
  });

  it("migrates existing local backups without deleting their original files", async () => {
    const directory = path.join(temporary, "data/snapshots");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, `${id}.sql`), dump);
    await fs.writeFile(path.join(directory, `${id}.meta.json`), JSON.stringify(meta));
    expect(await listSnapshots()).toHaveLength(1);
    expect((await readSnapshot(id)).sql).toBe(dump);
    expect(await fs.readFile(path.join(directory, `${id}.sql`), "utf8")).toBe(dump);
    await deleteSnapshot(id);
    expect(await listSnapshots()).toEqual([]);
    await expect(readSnapshot(id)).rejects.toThrow("not found");
  });

  it("refuses invalid IDs and immutable-object overwrites", async () => {
    await save();
    await expect(readSnapshot("../snapshot")).rejects.toThrow("Invalid snapshot id");
    await expect(save()).rejects.toThrow("Already exists");
    expect((await readSnapshot(id)).sql).toBe(dump);
  });

  it("provides a stream for downloads rather than a buffered SQL response", async () => {
    await save();
    const { stream, meta: saved } = await openSnapshotDownload(id);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    expect(Buffer.concat(chunks).toString()).toBe(dump);
    expect(saved.sizeBytes).toBe(Buffer.byteLength(dump));
  });

  it("refuses an oversized backup before uploading any bytes", async () => {
    const file = path.join(temporary, "oversized.sql");
    await fs.writeFile(file, "");
    await fs.truncate(file, MAX_SNAPSHOT_BYTES + 1);
    await expect(saveSnapshot(file, meta)).rejects.toMatchObject({ status: 413 });
    expect(cloud.files.size).toBe(0);
  });

  it("bounds restore and metadata reads before allocating large buffers", async () => {
    const saved = await save();
    cloud.files.set(`.private/bingo-snapshots/${id}.meta.json`, Buffer.from(JSON.stringify({
      ...saved, sizeBytes: MAX_SNAPSHOT_BYTES + 1,
    })));
    await expect(readSnapshot(id)).rejects.toMatchObject({ status: 413 });
    cloud.files.set(`.private/bingo-snapshots/${id}.meta.json`, Buffer.alloc(MAX_METADATA_BYTES + 1));
    await expect(listSnapshots()).rejects.toMatchObject({ status: 413 });
  });

  it("counts orphaned storage against the quota even when no backup is visible", async () => {
    cloud.files.set(".private/bingo-snapshots/orphan.sql", Buffer.from("orphan"));
    cloud.sizes.set(".private/bingo-snapshots/orphan.sql", MAX_SNAPSHOT_STORAGE_BYTES - MAX_METADATA_BYTES);
    await expect(snapshotCreationCapacity()).rejects.toThrow("storage limit");
    expect(await listSnapshots()).toEqual([]);
  });

  it("deletes modern backups without accumulating permanent tombstones", async () => {
    const file = path.join(temporary, "dump.sql");
    await fs.writeFile(file, dump);
    const modern = "snap_123_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    await saveSnapshot(file, { ...meta, id: modern });
    await deleteSnapshot(modern);
    expect(cloud.files.size).toBe(0);
  });
});
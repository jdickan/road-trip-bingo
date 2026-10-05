import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { compose, Writable, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { objectStorageClient } from "./objectStorage";
import {
  SnapshotStoreError, SnapshotByteLimit, MAX_SNAPSHOT_BYTES,
  MAX_METADATA_BYTES, SNAPSHOT_TIMEOUT_MS,
  snapshotCapacity, MAX_SNAPSHOT_STORAGE_BYTES,
} from "./snapshot-policy";
export { SnapshotStoreError } from "./snapshot-policy";

export interface SnapshotMeta {
  id: string;
  label: string;
  createdAt: string;
  wordCount: number;
  sizeBytes: number;
  formatVersion?: number;
  sha256?: string;
}

export function isSnapshotId(id: unknown): id is string {
  return typeof id === "string" && /^snap_\d+(?:_[a-f0-9]{32})?$/.test(id);
}

function location() {
  const directory = process.env.PRIVATE_OBJECT_DIR;
  if (!directory) throw new Error("Private snapshot storage is not configured.");
  const [bucketName, ...segments] = directory.replace(/^\/+/, "").split("/");
  if (!bucketName || !segments.length) throw new Error("Invalid private storage directory.");
  return {
    bucket: objectStorageClient.bucket(bucketName),
    prefix: `${segments.join("/").replace(/\/+$/, "")}/bingo-snapshots/`,
  };
}

function validateMeta(value: unknown, id?: string): SnapshotMeta {
  if (!value || typeof value !== "object") throw new SnapshotStoreError("Invalid snapshot metadata.");
  const m = value as SnapshotMeta;
  if (!isSnapshotId(m.id) || (id && m.id !== id) ||
      typeof m.label !== "string" || typeof m.createdAt !== "string" ||
      !Number.isFinite(Date.parse(m.createdAt)) ||
      !Number.isInteger(m.wordCount) || m.wordCount < 0 ||
      !Number.isInteger(m.sizeBytes) || m.sizeBytes < 0 ||
      (m.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(m.sha256))) {
    throw new SnapshotStoreError("Invalid snapshot metadata.");
  }
  return m;
}

/** SQL first, metadata last: an incomplete upload is never a visible backup. */
export async function saveSnapshot(dumpFile: string, meta: SnapshotMeta): Promise<SnapshotMeta> {
  validateMeta(meta);
  const stat = await fs.stat(dumpFile);
  if (stat.size > MAX_SNAPSHOT_BYTES) throw new SnapshotStoreError("Snapshot exceeds the 25 MiB size limit.", 413);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(dumpFile)) hash.update(chunk);
  const saved = { ...meta, sizeBytes: stat.size, sha256: hash.digest("hex") };
  const { bucket, prefix } = location();
  const sqlFile = bucket.file(`${prefix}${meta.id}.sql`);
  try {
    await pipeline(createReadStream(dumpFile), new SnapshotByteLimit(MAX_SNAPSHOT_BYTES),
      sqlFile.createWriteStream({
        resumable: false, metadata: { contentType: "application/sql" }, preconditionOpts: { ifGenerationMatch: 0 },
      }), { signal: AbortSignal.timeout(SNAPSHOT_TIMEOUT_MS) });
    await bucket.file(`${prefix}${meta.id}.meta.json`).save(JSON.stringify(saved), {
      resumable: false, contentType: "application/json", preconditionOpts: { ifGenerationMatch: 0 },
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 412) {
      await sqlFile.delete({ ignoreNotFound: true }).catch(() => {});
    }
    throw error;
  }
  return saved;
}

async function boundedRead(stream: Readable, maximum: number, expected?: SnapshotMeta): Promise<Buffer> {
  const chunks: Buffer[] = [];
  await pipeline(stream, new SnapshotByteLimit(maximum, expected), new Writable({
    write(chunk: Buffer, _encoding, callback) { chunks.push(chunk); callback(); },
  }), { signal: AbortSignal.timeout(SNAPSHOT_TIMEOUT_MS) });
  return Buffer.concat(chunks);
}

// Keep original local backups. Copy them to private storage on first discovery.
// Durable deletion markers prevent old deployment files resurrecting deleted backups.
async function migrateLocalSnapshots(): Promise<void> {
  const directory = path.resolve(process.cwd(), "data/snapshots");
  let names: string[];
  try { names = await fs.readdir(directory); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  const { bucket, prefix } = location();
  for (const name of names) {
    if (!name.endsWith(".meta.json")) continue;
    const id = name.slice(0, -".meta.json".length);
    if (!isSnapshotId(id)) continue;
    const [deleted] = await bucket.file(`${prefix}${id}.deleted`).exists();
    const [exists] = await bucket.file(`${prefix}${id}.meta.json`).exists();
    if (deleted || exists) continue;
    const meta = validateMeta(JSON.parse(await fs.readFile(path.join(directory, name), "utf8")), id);
    try { await saveSnapshot(path.join(directory, `${id}.sql`), meta); }
    catch (error) {
      // Another instance may have finished migrating this same immutable backup.
      if ((error as { code?: number }).code !== 412) throw error;
    }
  }
}

async function snapshotInventory() {
  const { bucket, prefix } = location();
  // Bound listings even if failed historical uploads left orphaned objects.
  const [files, nextPage] = await bucket.getFiles({ prefix, autoPaginate: false, maxResults: 256 });
  if (nextPage) throw new SnapshotStoreError("Snapshot storage inventory is too large. No new backup was created.");
  return { files, prefix };
}

export async function listSnapshots(): Promise<SnapshotMeta[]> {
  await migrateLocalSnapshots();
  const { files, prefix } = await snapshotInventory();
  const deleted = new Set(files.filter(f => f.name.endsWith(".deleted")).map(f => f.name.slice(0, -8)));
  const metas: SnapshotMeta[] = [];
  // Sequential bounded metadata reads avoid memory spikes from large listings.
  for (const file of files.filter(f => f.name.endsWith(".meta.json") &&
    !deleted.has(f.name.slice(0, -10)))) {
    const bytes = await boundedRead(file.createReadStream(), MAX_METADATA_BYTES);
    metas.push(validateMeta(JSON.parse(bytes.toString("utf8")), file.name.slice(prefix.length, -10)));
  }
  return metas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function snapshotCreationCapacity(): Promise<number> {
  const capacity = snapshotCapacity(await listSnapshots());
  const { files } = await snapshotInventory();
  let allocated = 0;
  for (const file of files) {
    const size = Number(file.metadata.size);
    if (!Number.isSafeInteger(size) || size < 0) throw new SnapshotStoreError("Could not verify snapshot storage usage.");
    allocated += size;
  }
  // Account for orphaned SQL and metadata as well as visible backups. Reserve
  // metadata overhead before launching a dump, so actual stored bytes stay capped.
  const remaining = MAX_SNAPSHOT_STORAGE_BYTES - allocated - MAX_METADATA_BYTES;
  if (remaining <= 0) throw new SnapshotStoreError("Snapshot storage limit reached. No new backup was created.");
  return Math.min(capacity, remaining);
}

async function readSnapshotMeta(id: string): Promise<SnapshotMeta> {
  if (!isSnapshotId(id)) throw new SnapshotStoreError("Invalid snapshot id.", 400);
  const { bucket, prefix } = location();
  const [deleted] = await bucket.file(`${prefix}${id}.deleted`).exists();
  const [exists] = await bucket.file(`${prefix}${id}.meta.json`).exists();
  if (deleted || !exists) throw new SnapshotStoreError("Snapshot not found.", 404);
  const metaBytes = await boundedRead(bucket.file(`${prefix}${id}.meta.json`).createReadStream(), MAX_METADATA_BYTES);
  return validateMeta(JSON.parse(metaBytes.toString("utf8")), id);
}

export async function readSnapshot(id: string): Promise<{ meta: SnapshotMeta; sql: string }> {
  const meta = await readSnapshotMeta(id);
  if (meta.sizeBytes > MAX_SNAPSHOT_BYTES) {
    throw new SnapshotStoreError("This backup exceeds the 25 MiB restore limit. It remains available for download.", 413);
  }
  const { bucket, prefix } = location();
  const sqlBytes = await boundedRead(bucket.file(`${prefix}${id}.sql`).createReadStream(), MAX_SNAPSHOT_BYTES, meta);
  return { meta, sql: sqlBytes.toString("utf8") };
}

export async function openSnapshotDownload(id: string): Promise<{ meta: SnapshotMeta; stream: Readable }> {
  const meta = await readSnapshotMeta(id);
  const { bucket, prefix } = location();
  const stream = compose(bucket.file(`${prefix}${id}.sql`).createReadStream(),
    new SnapshotByteLimit(meta.sizeBytes, meta));
  return { meta, stream };
}

export async function deleteSnapshot(id: string): Promise<void> {
  if (!isSnapshotId(id)) throw new SnapshotStoreError("Invalid snapshot id.", 400);
  const { bucket, prefix } = location();
  const [exists] = await bucket.file(`${prefix}${id}.meta.json`).exists();
  if (!exists) throw new SnapshotStoreError("Snapshot not found.", 404);
  // Only locally retained, legacy IDs need durable anti-resurrection markers.
  // Modern immutable UUID backups have no local originals; keeping deletion
  // markers for every one would let the historical inventory grow unbounded.
  if (/^snap_\d+$/.test(id)) {
    await bucket.file(`${prefix}${id}.deleted`).save("deleted", { resumable: false });
  }
  // Keep metadata until SQL deletion succeeds, so failures remain retryable.
  await bucket.file(`${prefix}${id}.sql`).delete({ ignoreNotFound: true });
  await bucket.file(`${prefix}${id}.meta.json`).delete({ ignoreNotFound: true });
}
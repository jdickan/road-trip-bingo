import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { objectStorageClient } from "./objectStorage";

export interface SnapshotMeta {
  id: string;
  label: string;
  createdAt: string;
  wordCount: number;
  sizeBytes: number;
  formatVersion?: number;
  sha256?: string;
}

export class SnapshotStoreError extends Error {
  constructor(message: string, public status = 409) {
    super(message);
  }
}

export function isSnapshotId(id: string): boolean {
  return /^snap_\d+(?:_[a-f0-9]{32})?$/.test(id);
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
  const bytes = await fs.readFile(dumpFile);
  const saved = { ...meta, sizeBytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  const { bucket, prefix } = location();
  const sqlFile = bucket.file(`${prefix}${meta.id}.sql`);
  await sqlFile.save(bytes, { resumable: false, contentType: "application/sql", preconditionOpts: { ifGenerationMatch: 0 } });
  try {
    await bucket.file(`${prefix}${meta.id}.meta.json`).save(JSON.stringify(saved), {
      resumable: false, contentType: "application/json", preconditionOpts: { ifGenerationMatch: 0 },
    });
  } catch (error) {
    await sqlFile.delete({ ignoreNotFound: true }).catch(() => {});
    throw error;
  }
  return saved;
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

export async function listSnapshots(): Promise<SnapshotMeta[]> {
  await migrateLocalSnapshots();
  const { bucket, prefix } = location();
  const [files] = await bucket.getFiles({ prefix });
  const deleted = new Set(files.filter(f => f.name.endsWith(".deleted")).map(f => f.name.slice(0, -8)));
  const metas = await Promise.all(files.filter(f => f.name.endsWith(".meta.json") &&
    !deleted.has(f.name.slice(0, -10))).map(async file => {
    const [bytes] = await file.download();
    return validateMeta(JSON.parse(bytes.toString("utf8")), file.name.slice(prefix.length, -10));
  }));
  return metas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readSnapshot(id: string): Promise<{ meta: SnapshotMeta; sql: string }> {
  if (!isSnapshotId(id)) throw new SnapshotStoreError("Invalid snapshot id.", 400);
  const { bucket, prefix } = location();
  const [deleted] = await bucket.file(`${prefix}${id}.deleted`).exists();
  const [exists] = await bucket.file(`${prefix}${id}.meta.json`).exists();
  if (deleted || !exists) throw new SnapshotStoreError("Snapshot not found.", 404);
  const [[metaBytes], [sqlBytes]] = await Promise.all([
    bucket.file(`${prefix}${id}.meta.json`).download(),
    bucket.file(`${prefix}${id}.sql`).download(),
  ]);
  const meta = validateMeta(JSON.parse(metaBytes.toString("utf8")), id);
  if (sqlBytes.length !== meta.sizeBytes ||
      (meta.sha256 && createHash("sha256").update(sqlBytes).digest("hex") !== meta.sha256)) {
    throw new SnapshotStoreError("Snapshot integrity check failed. No data was changed.");
  }
  return { meta, sql: sqlBytes.toString("utf8") };
}

export async function deleteSnapshot(id: string): Promise<void> {
  if (!isSnapshotId(id)) throw new SnapshotStoreError("Invalid snapshot id.", 400);
  const { bucket, prefix } = location();
  const [exists] = await bucket.file(`${prefix}${id}.meta.json`).exists();
  const [deleted] = await bucket.file(`${prefix}${id}.deleted`).exists();
  if (!exists || deleted) throw new SnapshotStoreError("Snapshot not found.", 404);
  await bucket.file(`${prefix}${id}.deleted`).save("deleted", { resumable: false });
  await Promise.all([".meta.json", ".sql"].map(suffix =>
    bucket.file(`${prefix}${id}${suffix}`).delete({ ignoreNotFound: true })));
}
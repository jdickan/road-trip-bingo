import { Router, type IRouter } from "express";
import fs from "fs/promises";
import path from "path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { sql, isNull } from "drizzle-orm";
import { db, wordsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  listSnapshots, saveSnapshot, readSnapshot, deleteSnapshot, openSnapshotDownload,
  snapshotCreationCapacity,
  isSnapshotId, SnapshotStoreError, type SnapshotMeta,
} from "../lib/snapshot-store";
import { restoreSnapshotSql } from "../lib/snapshot-restore";
import { dumpSnapshot } from "../lib/snapshot-dump";
import { SNAPSHOT_TIMEOUT_MS } from "../lib/snapshot-policy";
import {
  snapshotCreateLimit, snapshotRestoreLimit, snapshotDownloadLimit,
  snapshotMutationGlobalLimit, acquireSnapshotMutation, acquireSnapshotDownload,
} from "../lib/snapshot-limits";

const router: IRouter = Router();

// GET /snapshots
router.get("/snapshots", async (_req, res): Promise<void> => {
  try {
    const snapshots = await listSnapshots();
    res.json({ snapshots });
  } catch (err) {
    logger.error({ err }, "Failed to list snapshots");
    res.status(500).json({ error: "Failed to list snapshots" });
  }
});

// POST /snapshots — create a new snapshot
router.post("/snapshots", snapshotCreateLimit, snapshotMutationGlobalLimit, async (req, res): Promise<void> => {
  if (req.body?.label !== undefined && typeof req.body.label !== "string") {
    res.status(400).json({ error: "Snapshot label must be text." });
    return;
  }
  const label: string = (req.body?.label || "").trim() || new Date().toLocaleString();
  if (label.length > 200) { res.status(400).json({ error: "Snapshot labels must be at most 200 characters." }); return; }
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL not set" }); return; }

  const id = `snap_${Date.now()}_${randomUUID().replaceAll("-", "")}`;
  let directory: string | undefined;
  let release: (() => Promise<void>) | undefined;
  const cleanup = async () => {
    try {
      const temporary = directory;
      directory = undefined;
      if (temporary) await fs.rm(temporary, { recursive: true, force: true });
    } finally {
      const lease = release;
      release = undefined;
      await lease?.();
    }
  };

  try {
    release = await acquireSnapshotMutation();
    const capacity = await snapshotCreationCapacity();
    directory = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-snapshot-"));
    const dumpFile = path.join(directory, `${id}.sql`);
    await dumpSnapshot(dumpFile, dbUrl, capacity);

    const stat = await fs.stat(dumpFile);

    // Count live words via DB query (reliable, avoids regex-parsing the dump)
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wordsTable)
      .where(isNull(wordsTable.deletedAt));
    const wordCount = countResult[0]?.count ?? 0;

    const meta: SnapshotMeta = {
      id,
      label,
      createdAt: new Date().toISOString(),
      wordCount,
      sizeBytes: stat.size,
      formatVersion: 2,
    };
    const saved = await saveSnapshot(dumpFile, meta);
    // Finish cleanup/unlock before acknowledging success, so an immediately
    // following request cannot see a completed operation as still running.
    await cleanup();

    logger.info({ id, label, wordCount }, "Snapshot created");
    res.json({ snapshot: saved });
  } catch (err) {
    await cleanup();
    logger.error({ err }, "Failed to create snapshot");
    if (err instanceof SnapshotStoreError && err.status === 429) res.setHeader("Retry-After", "30");
    res.status(err instanceof SnapshotStoreError ? err.status : 500).json({
      error: err instanceof SnapshotStoreError ? err.message : "Failed to create snapshot",
    });
  } finally {
    await cleanup();
  }
});

// POST /snapshots/:id/restore
router.post("/snapshots/:id/restore", snapshotRestoreLimit, snapshotMutationGlobalLimit, async (req, res): Promise<void> => {
  const { id } = req.params;
  if (!isSnapshotId(id)) { res.status(400).json({ error: "Invalid snapshot id" }); return; }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL not set" }); return; }

  let release: (() => Promise<void>) | undefined;
  const cleanup = async () => {
    const lease = release;
    release = undefined;
    await lease?.();
  };
  try {
    release = await acquireSnapshotMutation();
    const { meta, sql: dump } = await readSnapshot(id);
    const freshWordCount = await restoreSnapshotSql(dump, dbUrl);
    await cleanup();

    // Backup objects stay immutable. Report the actual restored count.
    const updatedMeta: SnapshotMeta = { ...meta, wordCount: freshWordCount };

    logger.info({ id, label: meta.label, wordCount: freshWordCount }, "Snapshot restored");
    res.json({ restored: true, snapshot: updatedMeta });
  } catch (err) {
    await cleanup();
    logger.error({ err }, "Failed to restore snapshot");
    if (err instanceof SnapshotStoreError && err.status === 429) res.setHeader("Retry-After", "30");
    res.status(err instanceof SnapshotStoreError ? err.status : 500).json({
      error: err instanceof SnapshotStoreError ? err.message
        : "Restore failed. Your previous data was preserved. A saved board may no longer exist, or the backup could not be imported.",
    });
  } finally { await cleanup(); }
});

// GET /snapshots/:id/download — stream the SQL dump file to the client
router.get("/snapshots/:id/download", snapshotDownloadLimit, async (req, res): Promise<void> => {
  const { id } = req.params;
  if (!isSnapshotId(id)) { res.status(400).json({ error: "Invalid snapshot id" }); return; }

  let release: (() => void) | undefined;
  try {
    release = acquireSnapshotDownload();
    const { meta, stream } = await openSnapshotDownload(id);
    // Build a clean filename from the label if available
    let filename = `${id}.sql`;
    const safe = meta.label.replace(/[^a-zA-Z0-9_\-. ]/g, "_").trim();
    if (safe) filename = `${safe}.sql`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Length", meta.sizeBytes);
    await pipeline(stream, res, { signal: AbortSignal.timeout(SNAPSHOT_TIMEOUT_MS) });
    logger.info({ id, filename }, "Snapshot downloaded");
  } catch (err) {
    logger.error({ err }, "Failed to download snapshot");
    if (res.headersSent || res.destroyed) { res.destroy(); return; }
    if (err instanceof SnapshotStoreError && err.status === 429) res.setHeader("Retry-After", "30");
    res.status(err instanceof SnapshotStoreError ? err.status : 500).json({
      error: err instanceof SnapshotStoreError ? err.message : "Could not download snapshot.",
    });
  } finally { release?.(); }
});

// DELETE /snapshots/:id
router.delete("/snapshots/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  if (!isSnapshotId(id)) { res.status(400).json({ error: "Invalid snapshot id" }); return; }

  try {
    await deleteSnapshot(id);

    res.json({ deleted: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete snapshot");
    res.status(err instanceof SnapshotStoreError ? err.status : 500).json({
      error: err instanceof SnapshotStoreError ? err.message : "Failed to delete snapshot",
    });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { sql, isNull } from "drizzle-orm";
import { db, wordsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  listSnapshots, saveSnapshot, readSnapshot, deleteSnapshot,
  isSnapshotId, SnapshotStoreError, type SnapshotMeta,
} from "../lib/snapshot-store";
import { pgEnv, restoreSnapshotSql } from "../lib/snapshot-restore";

const execFileAsync = promisify(execFile);
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
router.post("/snapshots", async (req, res): Promise<void> => {
  if (req.body?.label !== undefined && typeof req.body.label !== "string") {
    res.status(400).json({ error: "Snapshot label must be text." });
    return;
  }
  const label: string = (req.body?.label || "").trim() || new Date().toLocaleString();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL not set" }); return; }

  const id = `snap_${Date.now()}_${randomUUID().replaceAll("-", "")}`;
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-snapshot-"));
  const dumpFile = path.join(directory, `${id}.sql`);

  try {
    // Dump the words table plus the word↔board junction (data only, plain text
    // format) so restores don't depend on the denormalized boards name column.
    await execFileAsync(
      "pg_dump",
      [
        "--data-only",
        "--table=bingo_words",
        "--table=bingo_word_boards",
        "--format=plain",
        `--file=${dumpFile}`,
      ],
      { env: pgEnv(dbUrl), timeout: 120_000 }
    );

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

    logger.info({ id, label, wordCount }, "Snapshot created");
    res.json({ snapshot: saved });
  } catch (err) {
    logger.error({ err }, "Failed to create snapshot");
    res.status(500).json({ error: "Failed to create snapshot" });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

// POST /snapshots/:id/restore
router.post("/snapshots/:id/restore", async (req, res): Promise<void> => {
  const { id } = req.params;
  if (!isSnapshotId(id)) { res.status(400).json({ error: "Invalid snapshot id" }); return; }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL not set" }); return; }

  try {
    const { meta, sql: dump } = await readSnapshot(id);
    const freshWordCount = await restoreSnapshotSql(dump, dbUrl);

    // Backup objects stay immutable. Report the actual restored count.
    const updatedMeta: SnapshotMeta = { ...meta, wordCount: freshWordCount };

    logger.info({ id, label: meta.label, wordCount: freshWordCount }, "Snapshot restored");
    res.json({ restored: true, snapshot: updatedMeta });
  } catch (err) {
    logger.error({ err }, "Failed to restore snapshot");
    res.status(err instanceof SnapshotStoreError ? err.status : 500).json({
      error: err instanceof SnapshotStoreError ? err.message
        : "Restore failed. Your previous data was preserved. A saved board may no longer exist, or the backup could not be imported.",
    });
  }
});

// GET /snapshots/:id/download — stream the SQL dump file to the client
router.get("/snapshots/:id/download", async (req, res): Promise<void> => {
  const { id } = req.params;
  if (!isSnapshotId(id)) { res.status(400).json({ error: "Invalid snapshot id" }); return; }

  try {
    const { meta, sql: dump } = await readSnapshot(id);
    // Build a clean filename from the label if available
    let filename = `${id}.sql`;
    const safe = meta.label.replace(/[^a-zA-Z0-9_\-. ]/g, "_").trim();
    if (safe) filename = `${safe}.sql`;
    const data = Buffer.from(dump, "utf8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Length", data.length);
    res.send(data);
    logger.info({ id, filename }, "Snapshot downloaded");
  } catch (err) {
    logger.error({ err }, "Failed to download snapshot");
    res.status(err instanceof SnapshotStoreError ? err.status : 500).json({
      error: err instanceof SnapshotStoreError ? err.message : "Could not download snapshot.",
    });
  }
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

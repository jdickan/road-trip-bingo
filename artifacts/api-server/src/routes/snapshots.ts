import { Router, type IRouter } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { sql, isNull } from "drizzle-orm";
import { db, wordsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const execFileAsync = promisify(execFile);
const router: IRouter = Router();

const SNAPSHOTS_DIR = path.resolve(process.cwd(), "data/snapshots");

// Ensure snapshots dir exists
async function ensureDir() {
  await fs.mkdir(SNAPSHOTS_DIR, { recursive: true });
}

// Parse DATABASE_URL into pg_dump/psql env vars
function pgEnv(url: string): NodeJS.ProcessEnv {
  const u = new URL(url);
  return {
    ...process.env,
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: u.username,
    PGPASSWORD: u.password,
    PGDATABASE: u.pathname.replace(/^\//, ""),
  };
}

interface SnapshotMeta {
  id: string;
  label: string;
  createdAt: string;
  wordCount: number;
  sizeBytes: number;
}

async function listSnapshots(): Promise<SnapshotMeta[]> {
  await ensureDir();
  const files = await fs.readdir(SNAPSHOTS_DIR);
  const metas: SnapshotMeta[] = [];
  for (const f of files) {
    if (!f.endsWith(".meta.json")) continue;
    try {
      const raw = await fs.readFile(path.join(SNAPSHOTS_DIR, f), "utf8");
      metas.push(JSON.parse(raw));
    } catch {}
  }
  return metas.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

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
  const label: string = (req.body?.label || "").trim() || new Date().toLocaleString();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL not set" }); return; }

  await ensureDir();
  const id = `snap_${Date.now()}`;
  const dumpFile = path.join(SNAPSHOTS_DIR, `${id}.sql`);
  const metaFile = path.join(SNAPSHOTS_DIR, `${id}.meta.json`);

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
      { env: pgEnv(dbUrl) }
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
    };
    await fs.writeFile(metaFile, JSON.stringify(meta, null, 2));

    logger.info({ id, label, wordCount }, "Snapshot created");
    res.json({ snapshot: meta });
  } catch (err) {
    logger.error({ err }, "Failed to create snapshot");
    // Clean up partial files
    await fs.unlink(dumpFile).catch(() => {});
    await fs.unlink(metaFile).catch(() => {});
    res.status(500).json({ error: "Failed to create snapshot" });
  }
});

// POST /snapshots/:id/restore
router.post("/snapshots/:id/restore", async (req, res): Promise<void> => {
  const { id } = req.params;
  // Validate id is safe (alphanumeric + underscore only)
  if (!/^snap_\d+$/.test(id)) { res.status(400).json({ error: "Invalid snapshot id" }); return; }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL not set" }); return; }

  const dumpFile = path.join(SNAPSHOTS_DIR, `${id}.sql`);
  const metaFile = path.join(SNAPSHOTS_DIR, `${id}.meta.json`);

  try {
    await fs.access(dumpFile);
    const raw = await fs.readFile(metaFile, "utf8");
    const meta: SnapshotMeta = JSON.parse(raw);

    // Truncate the table first, then restore.
    // Note: CASCADE also truncates bingo_word_boards (FK to bingo_words).
    // Newer snapshots include bingo_word_boards rows in the dump itself;
    // older snapshots fall back to the name-based rebuild below.
    const env = pgEnv(dbUrl);
    await execFileAsync(
      "psql",
      ["--command=TRUNCATE TABLE bingo_words RESTART IDENTITY CASCADE;"],
      { env }
    );
    await execFileAsync("psql", [`--file=${dumpFile}`], { env });

    // Fallback for snapshots that predate the junction table (or whose junction
    // COPY failed, e.g. a referenced board was deleted): rebuild word↔board rows
    // from the restored boards name array. No-op when the dump restored them.
    const junctionCount = await db.execute(
      sql`SELECT count(*)::int AS count FROM bingo_word_boards`
    );
    const restoredJunctionRows =
      (junctionCount.rows[0] as { count: number } | undefined)?.count ?? 0;
    if (restoredJunctionRows === 0) {
      await db.execute(sql`
        INSERT INTO bingo_word_boards (word_id, board_id)
        SELECT DISTINCT w.id, b.id
        FROM bingo_words w
        CROSS JOIN LATERAL unnest(w.boards) AS bn(board_name)
        JOIN bingo_boards b ON b.name = bn.board_name
        ON CONFLICT DO NOTHING
      `);
    }

    // Get accurate word count from the restored data
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wordsTable)
      .where(isNull(wordsTable.deletedAt));
    const freshWordCount = countResult[0]?.count ?? 0;

    // Update stored meta with fresh count
    const updatedMeta: SnapshotMeta = { ...meta, wordCount: freshWordCount };
    await fs.writeFile(metaFile, JSON.stringify(updatedMeta, null, 2)).catch(() => {});

    logger.info({ id, label: meta.label, wordCount: freshWordCount }, "Snapshot restored");
    res.json({ restored: true, snapshot: updatedMeta });
  } catch (err) {
    logger.error({ err }, "Failed to restore snapshot");
    res.status(500).json({ error: "Failed to restore snapshot" });
  }
});

// GET /snapshots/:id/download — stream the SQL dump file to the client
router.get("/snapshots/:id/download", async (req, res): Promise<void> => {
  const { id } = req.params;
  if (!/^snap_\d+$/.test(id)) { res.status(400).json({ error: "Invalid snapshot id" }); return; }

  const dumpFile = path.join(SNAPSHOTS_DIR, `${id}.sql`);
  const metaFile = path.join(SNAPSHOTS_DIR, `${id}.meta.json`);

  try {
    await fs.access(dumpFile);

    // Build a clean filename from the label if available
    let filename = `${id}.sql`;
    try {
      const raw = await fs.readFile(metaFile, "utf8");
      const meta: SnapshotMeta = JSON.parse(raw);
      const safe = meta.label.replace(/[^a-zA-Z0-9_\-. ]/g, "_").trim();
      if (safe) filename = `${safe}.sql`;
    } catch {}

    const data = await fs.readFile(dumpFile);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Length", data.length);
    res.send(data);
    logger.info({ id, filename }, "Snapshot downloaded");
  } catch (err) {
    logger.error({ err }, "Failed to download snapshot");
    res.status(404).json({ error: "Snapshot not found" });
  }
});

// DELETE /snapshots/:id
router.delete("/snapshots/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  if (!/^snap_\d+$/.test(id)) { res.status(400).json({ error: "Invalid snapshot id" }); return; }

  const dumpFile = path.join(SNAPSHOTS_DIR, `${id}.sql`);
  const metaFile = path.join(SNAPSHOTS_DIR, `${id}.meta.json`);

  try {
    // Check whether the snapshot actually exists before attempting deletion
    const [dumpExists, metaExists] = await Promise.all([
      fs.access(dumpFile).then(() => true).catch(() => false),
      fs.access(metaFile).then(() => true).catch(() => false),
    ]);

    if (!dumpExists || !metaExists) {
      res.status(404).json({ error: "Snapshot not found" });
      return;
    }

    await Promise.all([
      fs.unlink(dumpFile),
      fs.unlink(metaFile),
    ]);

    res.json({ deleted: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete snapshot");
    res.status(500).json({ error: "Failed to delete snapshot" });
  }
});

export default router;

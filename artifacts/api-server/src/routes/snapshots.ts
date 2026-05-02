import { Router, type IRouter } from "express";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
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

// GET /api/snapshots
router.get("/api/snapshots", async (_req, res): Promise<void> => {
  try {
    const snapshots = await listSnapshots();
    res.json({ snapshots });
  } catch (err) {
    logger.error({ err }, "Failed to list snapshots");
    res.status(500).json({ error: "Failed to list snapshots" });
  }
});

// POST /api/snapshots — create a new snapshot
router.post("/api/snapshots", async (req, res): Promise<void> => {
  const label: string = (req.body?.label || "").trim() || new Date().toLocaleString();
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { res.status(500).json({ error: "DATABASE_URL not set" }); return; }

  await ensureDir();
  const id = `snap_${Date.now()}`;
  const dumpFile = path.join(SNAPSHOTS_DIR, `${id}.sql`);
  const metaFile = path.join(SNAPSHOTS_DIR, `${id}.meta.json`);

  try {
    // Dump only the bingo_words table (data only, plain text format)
    await execFileAsync(
      "pg_dump",
      [
        "--data-only",
        "--table=bingo_words",
        "--format=plain",
        `--file=${dumpFile}`,
      ],
      { env: pgEnv(dbUrl) }
    );

    const stat = await fs.stat(dumpFile);

    // Count words in the dump as a quick sanity check
    const content = await fs.readFile(dumpFile, "utf8");
    const wordCount = (content.match(/^COPY /m) ? content.split("\n").filter(l => l && !l.startsWith("\\") && !l.startsWith("COPY") && !l.startsWith("--") && !l.startsWith("SET") && l.trim() !== "").length : 0);

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

// POST /api/snapshots/:id/restore
router.post("/api/snapshots/:id/restore", async (req, res): Promise<void> => {
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

    // Truncate the table first, then restore
    const env = pgEnv(dbUrl);
    await execFileAsync(
      "psql",
      ["--command=TRUNCATE TABLE bingo_words RESTART IDENTITY CASCADE;"],
      { env }
    );
    await execFileAsync("psql", [`--file=${dumpFile}`], { env });

    logger.info({ id, label: meta.label }, "Snapshot restored");
    res.json({ restored: true, snapshot: meta });
  } catch (err) {
    logger.error({ err }, "Failed to restore snapshot");
    res.status(500).json({ error: "Failed to restore snapshot" });
  }
});

// DELETE /api/snapshots/:id
router.delete("/api/snapshots/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  if (!/^snap_\d+$/.test(id)) { res.status(400).json({ error: "Invalid snapshot id" }); return; }

  const dumpFile = path.join(SNAPSHOTS_DIR, `${id}.sql`);
  const metaFile = path.join(SNAPSHOTS_DIR, `${id}.meta.json`);

  try {
    await fs.unlink(dumpFile).catch(() => {});
    await fs.unlink(metaFile).catch(() => {});
    res.json({ deleted: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete snapshot");
    res.status(500).json({ error: "Failed to delete snapshot" });
  }
});

export default router;

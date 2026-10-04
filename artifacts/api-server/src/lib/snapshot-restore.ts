import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SnapshotStoreError } from "./snapshot-store";

const execFileAsync = promisify(execFile);

export function pgEnv(url: string): NodeJS.ProcessEnv {
  // PGDATABASE is a literal database name, not an expandable connection URI.
  // Translate the URL without putting credentials into command arguments.
  const parsed = new URL(url);
  return {
    ...process.env,
    PGHOST: parsed.hostname,
    PGPORT: parsed.port || "5432",
    PGUSER: decodeURIComponent(parsed.username),
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGDATABASE: decodeURIComponent(parsed.pathname.slice(1)),
    PGSSLMODE: parsed.searchParams.get("sslmode") ?? process.env.PGSSLMODE ?? "prefer",
  };
}

export function buildRestoreScript(dump: string): string {
  // Empty modern junctions still contain a COPY header. Never infer legacy
  // format from a row count, or rebuild failed imports using denormalized names.
  if (!/^COPY (?:public\.)?bingo_word_boards\s*\(/m.test(dump)) {
    throw new SnapshotStoreError(
      "This older snapshot has no saved board links and cannot be restored safely. Download it for manual recovery. No data was changed.",
    );
  }
  return [
    "SET LOCAL lock_timeout = '15s';",
    "LOCK TABLE public.bingo_words, public.bingo_word_boards, public.bingo_boards IN ACCESS EXCLUSIVE MODE;",
    "TRUNCATE TABLE public.bingo_words RESTART IDENTITY CASCADE;",
    dump,
    // pg_dump clears search_path, so the sequence must also be schema-qualified.
    "UPDATE public.bingo_boards SET content_version = nextval('public.bingo_content_version_seq')::int WHERE published = true;",
    "SELECT 'BINGO_RESTORE_WORD_COUNT=' || count(*) FROM public.bingo_words WHERE deleted_at IS NULL;",
  ].join("\n");
}

export async function restoreSnapshotSql(dump: string, databaseUrl: string): Promise<number> {
  const script = buildRestoreScript(dump);
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "bingo-restore-"));
  try {
    const file = path.join(directory, "restore.sql");
    await fs.writeFile(file, script, { mode: 0o600 });
    // BEGIN/COMMIT wraps truncation, COPY, FK checks and content-version bumps.
    // Any SQL error stops psql and rolls the entire operation back.
    const { stdout } = await execFileAsync("psql", [
      "--no-psqlrc", "--single-transaction", "--set=ON_ERROR_STOP=1", `--file=${file}`,
    ], { env: pgEnv(databaseUrl), timeout: 120_000 });
    const count = stdout.match(/BINGO_RESTORE_WORD_COUNT=(\d+)/);
    if (!count) throw new Error("Restore completed but its word count could not be confirmed.");
    return Number(count[1]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
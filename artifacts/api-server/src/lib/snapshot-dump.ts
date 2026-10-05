import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { SnapshotByteLimit, SNAPSHOT_TIMEOUT_MS } from "./snapshot-policy";
import { pgEnv } from "./snapshot-restore";

export async function dumpSnapshot(file: string, databaseUrl: string, maxBytes: number): Promise<void> {
  // Stream stdout through a byte limit, rather than allowing pg_dump to write
  // an arbitrarily large temporary file before its size can be checked.
  const child = spawn("pg_dump", [
    "--data-only", "--table=bingo_words", "--table=bingo_word_boards", "--format=plain",
  ], { env: pgEnv(databaseUrl), stdio: ["ignore", "pipe", "pipe"] });
  child.stderr.resume(); // Drain diagnostics without accumulating attacker-sized output.
  const closed = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", code => code === 0 ? resolve() : reject(new Error("Snapshot dump failed.")));
  });
  const timer = setTimeout(() => child.kill("SIGKILL"), SNAPSHOT_TIMEOUT_MS);
  timer.unref();
  try {
    await Promise.all([
      closed,
      pipeline(child.stdout, new SnapshotByteLimit(maxBytes), createWriteStream(file, { mode: 0o600 })),
    ]);
  } catch (error) {
    child.kill("SIGKILL");
    await closed.catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
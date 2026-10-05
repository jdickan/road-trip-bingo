import { rateLimit, MemoryStore } from "express-rate-limit";
import { SnapshotStoreError } from "./snapshot-policy";

const stores: MemoryStore[] = [];
function limiter(limit: number, windowMs: number, global = false) {
  const store = new MemoryStore();
  stores.push(store);
  return rateLimit({
    windowMs, limit, store, standardHeaders: "draft-7", legacyHeaders: false,
    ...(global ? { keyGenerator: () => "snapshots" } : {}),
    message: { error: "Too many snapshot requests. Please wait before trying again." },
  });
}

// Auth runs before these: unauthenticated callers cannot consume editor quotas.
export const snapshotRequestLimit = limiter(30, 60_000);
export const snapshotGlobalRequestLimit = limiter(60, 60_000, true);
export const snapshotCreateLimit = limiter(2, 10 * 60_000);
export const snapshotRestoreLimit = limiter(1, 10 * 60_000);
export const snapshotDownloadLimit = limiter(10, 60_000);
export const snapshotMutationGlobalLimit = limiter(4, 10 * 60_000, true);

let mutationBusy = false;
let downloads = 0;

export async function acquireSnapshotMutation(): Promise<() => Promise<void>> {
  if (mutationBusy) throw new SnapshotStoreError("A snapshot operation is already running. Please wait.", 429);
  mutationBusy = true;
  try {
    const { pool } = await import("@workspace/db");
    const client = await pool.connect();
    try {
      // Session-level lock coordinates all app instances, not just this process.
      const result = await client.query("SELECT pg_try_advisory_lock(740075) AS acquired");
      if (!result.rows[0]?.acquired) throw new SnapshotStoreError("A snapshot operation is already running. Please wait.", 429);
    } catch (error) {
      client.release(true);
      throw error;
    }
    return async () => {
      try { await client.query("SELECT pg_advisory_unlock(740075)"); client.release(); }
      catch { client.release(true); }
      finally { mutationBusy = false; }
    };
  } catch (error) {
    mutationBusy = false;
    throw error;
  }
}

export function acquireSnapshotDownload(): () => void {
  if (downloads >= 2) throw new SnapshotStoreError("Too many snapshot downloads are running. Please wait.", 429);
  downloads++;
  return () => { downloads--; };
}

// No HTTP reset endpoint; regression fixtures alone may reset limiter state.
export function resetSnapshotLimitsForTests() {
  if (process.env.NODE_ENV !== "test") throw new Error("Test-only limiter reset.");
  stores.forEach(store => store.resetAll());
}
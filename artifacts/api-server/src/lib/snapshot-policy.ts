import { Transform, type TransformCallback } from "node:stream";
import { createHash } from "node:crypto";

export const MAX_SNAPSHOTS = 20;
export const MAX_SNAPSHOT_BYTES = 25 * 1024 * 1024;
export const MAX_SNAPSHOT_STORAGE_BYTES = 250 * 1024 * 1024;
export const SNAPSHOT_TIMEOUT_MS = 120_000;
export const MAX_METADATA_BYTES = 64 * 1024;

export class SnapshotStoreError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

export function snapshotCapacity(snapshots: { sizeBytes: number }[]): number {
  const remaining = MAX_SNAPSHOT_STORAGE_BYTES - snapshots.reduce((total, s) => total + s.sizeBytes, 0);
  if (snapshots.length >= MAX_SNAPSHOTS || remaining <= 0) {
    throw new SnapshotStoreError("Snapshot storage limit reached. Delete an unneeded backup before saving another.", 409);
  }
  return Math.min(MAX_SNAPSHOT_BYTES, remaining);
}

/** Bounds every chunk before forwarding it; optionally verifies at EOF. */
export class SnapshotByteLimit extends Transform {
  private bytes = 0;
  private hash = createHash("sha256");
  constructor(private maximum: number, private expected?: { sizeBytes: number; sha256?: string }) {
    super();
  }
  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
    this.bytes += chunk.length;
    if (this.bytes > this.maximum) {
      callback(new SnapshotStoreError("Snapshot exceeds the allowed size. No data was changed.", 413));
      return;
    }
    this.hash.update(chunk);
    callback(null, chunk);
  }
  override _flush(callback: TransformCallback) {
    if (this.expected && (this.bytes !== this.expected.sizeBytes ||
        (this.expected.sha256 && this.hash.digest("hex") !== this.expected.sha256))) {
      callback(new SnapshotStoreError("Snapshot integrity check failed. No data was changed."));
      return;
    }
    callback();
  }
}
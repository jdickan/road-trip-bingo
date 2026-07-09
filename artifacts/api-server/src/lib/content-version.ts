import { sql, and, eq, inArray } from "drizzle-orm";
import { db, boardsTable } from "@workspace/db";

/**
 * Content-version bumping for the public /v1 API sync model.
 *
 * Every event that changes what an external consumer would receive from
 * `GET /v1/boards/:id/bundle` must stamp the affected published board(s)
 * with the next value from the global `bingo_content_version_seq` sequence.
 * The sequence is global (not per-board), so `?since=<version>` delta
 * queries reduce to `content_version > N` across all published boards.
 *
 * Unpublished boards are never bumped: they are invisible to /v1, and the
 * publish transition itself always bumps, so a board re-entering the
 * published set is guaranteed a fresh version at that moment.
 */

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const nextContentVersion = sql`nextval('bingo_content_version_seq')::int`;

/**
 * Stamp the given boards (only those currently published) with the next
 * content version. Each affected row draws its own sequence value.
 */
export async function bumpBoardsContentVersion(
  tx: DbOrTx,
  boardIds: number[],
): Promise<void> {
  const unique = [...new Set(boardIds)];
  if (unique.length === 0) return;
  await tx
    .update(boardsTable)
    .set({ contentVersion: nextContentVersion })
    .where(and(inArray(boardsTable.id, unique), eq(boardsTable.published, true)));
}

/**
 * Stamp ALL published boards with a fresh content version. Used after a
 * snapshot restore, which replaces word + junction data wholesale without
 * touching board rows.
 */
export async function bumpAllPublishedBoards(tx: DbOrTx): Promise<void> {
  await tx
    .update(boardsTable)
    .set({ contentVersion: nextContentVersion })
    .where(eq(boardsTable.published, true));
}

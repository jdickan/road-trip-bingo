import { createHash } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, gt, isNull, inArray, sql } from "drizzle-orm";
import { db, boardsTable, wordsTable, wordBoardsTable } from "@workspace/db";
import {
  ListPublishedBoardsQueryParams,
  ListPublishedBoardsResponse,
  GetBoardBundleParams,
  GetBoardBundleResponse,
} from "@workspace/api-zod";

/**
 * Public /v1 namespace — read-only, versioned API for external consumers
 * (the iOS app). Strictly GET-only: this router must never gain a mutation
 * route. Auth model: X-API-Key guard + rate limit applied in app.ts;
 * the admin Bearer-token guard explicitly exempts /v1/*.
 *
 * Visibility rule: only boards with published = true exist here. Unpublished
 * boards return the same 404 as nonexistent ones so their existence is not
 * leaked.
 */

const router: IRouter = Router();

type BoardRow = typeof boardsTable.$inferSelect;

/** Fixed key order — part of the public contract. */
function mapBoardSummary(row: BoardRow, wordCount: number) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ageLevels: row.ageLevels,
    difficulty: row.difficulty,
    timeOfYear: row.timeOfYear,
    contentVersion: row.contentVersion,
    wordCount,
  };
}

/** Non-deleted word counts per board, restricted to the given board IDs. */
async function getWordCounts(boardIds: number[]): Promise<Map<number, number>> {
  if (boardIds.length === 0) return new Map();
  const rows = await db
    .select({
      boardId: wordBoardsTable.boardId,
      count: sql<number>`count(*)::int`,
    })
    .from(wordBoardsTable)
    .innerJoin(wordsTable, eq(wordBoardsTable.wordId, wordsTable.id))
    .where(and(inArray(wordBoardsTable.boardId, boardIds), isNull(wordsTable.deletedAt)))
    .groupBy(wordBoardsTable.boardId);
  return new Map(rows.map((r) => [r.boardId, r.count]));
}

// GET /v1/boards — list published boards (optionally only those changed since a version)
router.get("/v1/boards", async (req: Request, res: Response): Promise<void> => {
  const query = ListPublishedBoardsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  try {
    const since = query.data.since;
    const where =
      since !== undefined
        ? and(eq(boardsTable.published, true), gt(boardsTable.contentVersion, since))
        : eq(boardsTable.published, true);

    // latestVersion spans ALL published boards regardless of the `since`
    // filter — the client persists it as its next `since` cursor.
    // Deliberately queried BEFORE the board list: a bump landing between the
    // two queries then exceeds the returned cursor and is re-fetched on the
    // next sync (erring in the safe direction), instead of being included in
    // the cursor while missing from the list (permanently skipped).
    const [latestRow] = await db
      .select({
        latest: sql<number>`coalesce(max(${boardsTable.contentVersion}), 0)::int`,
      })
      .from(boardsTable)
      .where(eq(boardsTable.published, true));

    const boards = await db
      .select()
      .from(boardsTable)
      .where(where)
      .orderBy(boardsTable.id);

    const counts = await getWordCounts(boards.map((b) => b.id));

    res.json(
      ListPublishedBoardsResponse.parse({
        boards: boards.map((b) => mapBoardSummary(b, counts.get(b.id) ?? 0)),
        total: boards.length,
        latestVersion: latestRow?.latest ?? 0,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "GET /v1/boards failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /v1/boards/:id/bundle — self-contained content bundle for one published board
router.get(
  "/v1/boards/:id/bundle",
  async (req: Request, res: Response): Promise<void> => {
    const params = GetBoardBundleParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid board id" });
      return;
    }

    try {
      const [board] = await db
        .select()
        .from(boardsTable)
        .where(
          and(eq(boardsTable.id, params.data.id), eq(boardsTable.published, true)),
        );

      // Unpublished and nonexistent boards are indistinguishable on purpose.
      if (!board) {
        res.status(404).json({ error: "Board not found" });
        return;
      }

      const wordRows = await db
        .select()
        .from(wordsTable)
        .innerJoin(wordBoardsTable, eq(wordBoardsTable.wordId, wordsTable.id))
        .where(
          and(eq(wordBoardsTable.boardId, board.id), isNull(wordsTable.deletedAt)),
        )
        .orderBy(wordsTable.id);

      // Canonical word list: sorted by id (orderBy above), fixed key order.
      // Both are part of the checksum contract — do not reorder.
      const words = wordRows.map(({ bingo_words: w }) => ({
        id: w.id,
        word: w.word,
        spanish: w.spanish,
        emoji: w.emoji,
        age: w.age,
        findability: w.findability,
        seasons: w.seasons,
        dayNight: w.dayNight,
        regions: w.regions,
        surroundings: w.surroundings,
      }));

      const checksum =
        "sha256:" +
        createHash("sha256").update(JSON.stringify(words)).digest("hex");

      res.json(
        GetBoardBundleResponse.parse({
          board: mapBoardSummary(board, words.length),
          words,
          contentVersion: board.contentVersion,
          checksum,
        }),
      );
    } catch (err) {
      req.log.error({ err }, "GET /v1/boards/:id/bundle failed");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;

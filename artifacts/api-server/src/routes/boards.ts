import { Router, type IRouter, type Request, type Response } from "express";
import { eq, isNull } from "drizzle-orm";
import { db, boardsTable, wordsTable, wordBoardsTable } from "@workspace/db";
import { bumpBoardsContentVersion } from "../lib/content-version";

const router: IRouter = Router();

type BoardStatus = "active" | "draft" | "concept";

function mapBoard(row: typeof boardsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    ageLevels: row.ageLevels ?? [],
    difficulty: row.difficulty ?? null,
    timeOfYear: row.timeOfYear ?? null,
    availability: row.availability ?? null,
    status: row.status,
    published: row.published,
    publishedAt: row.publishedAt ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Coverage + preview computation (server-owned curation-quality rules)
// ---------------------------------------------------------------------------

interface BoardWordRow {
  wordId: number;
  word: string;
  emoji: string | null;
  age: string | null;
  findability: string | null;
}

/** Minimum word pool for a 5x5 board to be considered adequately stocked. */
const MIN_WORDS = 25;
/** Number of words included in the deterministic preview sample. */
const PREVIEW_SIZE = 8;

type CoverageStatus = "well-covered" | "needs-words" | "unbalanced";

function computeCoverage(words: BoardWordRow[]): { status: CoverageStatus; label: string } {
  if (words.length === 0) {
    return { status: "needs-words", label: "No words yet" };
  }
  if (words.length < MIN_WORDS) {
    return { status: "needs-words", label: `Needs more words (${words.length}/${MIN_WORDS})` };
  }

  const findabilities = new Set(
    words.map((w) => w.findability).filter((f): f is string => f !== null),
  );
  if (findabilities.size === 1 && findabilities.has("Low")) {
    return { status: "unbalanced", label: "All Low findability" };
  }

  const ages = new Set(words.map((w) => w.age).filter((a): a is string => a !== null));
  if (ages.size === 1) {
    return { status: "unbalanced", label: `Only one age tier (${[...ages][0]})` };
  }

  return { status: "well-covered", label: "Well-covered" };
}

/**
 * Deterministic sample seeded by board id — stable across refetches so the
 * preview doesn't jitter on every re-render.
 */
function computePreview(boardId: number, words: BoardWordRow[]) {
  const scored = words.map((w) => {
    // Simple integer hash mixing boardId and wordId
    let h = (Math.imul(w.wordId + 1, 2654435761) ^ Math.imul(boardId + 1, 40503)) >>> 0;
    h = (Math.imul(h ^ (h >>> 16), 2246822507) ^ (h >>> 13)) >>> 0;
    return { score: h, w };
  });
  scored.sort((a, b) => a.score - b.score || a.w.wordId - b.w.wordId);
  return scored
    .slice(0, PREVIEW_SIZE)
    .map(({ w }) => ({ id: w.wordId, word: w.word, emoji: w.emoji ?? null }));
}

function parseBoardId(id: string): number | null {
  const n = parseInt(id, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

function parseBodyFields(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const description = typeof body.description === "string" ? body.description : undefined;
  const ageLevels = Array.isArray(body.ageLevels)
    ? (body.ageLevels as unknown[]).filter((v) => typeof v === "string") as string[]
    : undefined;
  const difficulty = typeof body.difficulty === "string" ? body.difficulty : undefined;
  const timeOfYear = typeof body.timeOfYear === "string" ? body.timeOfYear : undefined;
  const availability = typeof body.availability === "string" ? body.availability : undefined;
  const statusRaw = typeof body.status === "string" ? body.status : undefined;
  const status: BoardStatus | undefined =
    statusRaw === "active" || statusRaw === "draft" || statusRaw === "concept"
      ? statusRaw
      : undefined;
  const published = typeof body.published === "boolean" ? body.published : undefined;
  const notes = typeof body.notes === "string" ? body.notes : undefined;
  return { name, description, ageLevels, difficulty, timeOfYear, availability, status, published, notes };
}

// GET /boards
router.get("/boards", async (req: Request, res: Response): Promise<void> => {
  try {
    const boards = await db.select().from(boardsTable).orderBy(boardsTable.name);

    // All (board, word) associations via the junction, excluding soft-deleted
    // words — used for word counts, coverage, and preview samples.
    const rows = await db
      .select({
        boardId: wordBoardsTable.boardId,
        wordId: wordsTable.id,
        word: wordsTable.word,
        emoji: wordsTable.emoji,
        age: wordsTable.age,
        findability: wordsTable.findability,
      })
      .from(wordBoardsTable)
      .innerJoin(wordsTable, eq(wordBoardsTable.wordId, wordsTable.id))
      .where(isNull(wordsTable.deletedAt));

    const wordsByBoard = new Map<number, BoardWordRow[]>();
    for (const r of rows) {
      const list = wordsByBoard.get(r.boardId);
      const entry: BoardWordRow = {
        wordId: r.wordId,
        word: r.word,
        emoji: r.emoji,
        age: r.age,
        findability: r.findability,
      };
      if (list) list.push(entry);
      else wordsByBoard.set(r.boardId, [entry]);
    }

    res.json({
      boards: boards.map((b) => {
        const words = wordsByBoard.get(b.id) ?? [];
        return {
          ...mapBoard(b),
          wordCount: words.length,
          coverage: computeCoverage(words),
          preview: computePreview(b.id, words),
        };
      }),
      total: boards.length,
    });
  } catch (err) {
    req.log.error({ err }, "GET /boards failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /boards/:id
router.get("/boards/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseBoardId(String(req.params.id));
  if (!id) {
    res.status(400).json({ error: "Invalid board id" });
    return;
  }

  try {
    const [board] = await db.select().from(boardsTable).where(eq(boardsTable.id, id));
    if (!board) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    res.json(mapBoard(board));
  } catch (err) {
    req.log.error({ err }, "GET /boards/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /boards
router.post("/boards", async (req: Request, res: Response): Promise<void> => {
  const body = parseBodyFields(req.body ?? {});
  if (!body.name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  try {
    const [board] = await db
      .insert(boardsTable)
      .values({
        name: body.name,
        description: body.description ?? null,
        ageLevels: body.ageLevels ?? [],
        difficulty: body.difficulty ?? null,
        timeOfYear: body.timeOfYear ?? null,
        availability: body.availability ?? null,
        status: body.status ?? "active",
        published: body.published ?? false,
        publishedAt: body.published ? new Date() : null,
        notes: body.notes ?? null,
      })
      .returning();

    res.status(201).json(mapBoard(board));
  } catch (err) {
    req.log.error({ err }, "POST /boards failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /boards/:id
router.patch("/boards/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseBoardId(String(req.params.id));
  if (!id) {
    res.status(400).json({ error: "Invalid board id" });
    return;
  }

  try {
    const body = parseBodyFields(req.body ?? {});

    const board = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(boardsTable)
        .where(eq(boardsTable.id, id));
      if (!existing) return null;

      const updateData: Partial<typeof boardsTable.$inferInsert> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.ageLevels !== undefined) updateData.ageLevels = body.ageLevels;
      if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
      if (body.timeOfYear !== undefined) updateData.timeOfYear = body.timeOfYear;
      if (body.availability !== undefined) updateData.availability = body.availability;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.published !== undefined && body.published !== existing.published) {
        updateData.published = body.published;
        // publishedAt = last publish time: stamped on the false→true
        // transition, cleared on unpublish, untouched by republish no-ops.
        updateData.publishedAt = body.published ? new Date() : null;
      }
      if (body.notes !== undefined) updateData.notes = body.notes;

      const [updated] =
        Object.keys(updateData).length > 0
          ? await tx
              .update(boardsTable)
              .set(updateData)
              .where(eq(boardsTable.id, id))
              .returning()
          : [existing];

      // Content-version bump (drives the /v1 `since` delta sync):
      //  - publish transition (false→true) always bumps, so every published
      //    board carries a version from this sequence;
      //  - edits to bundle-visible metadata bump only when the board is
      //    published after this update.
      const publishing = body.published === true && !existing.published;
      const bundleMetadataChanged =
        (body.name !== undefined && body.name !== existing.name) ||
        (body.description !== undefined && body.description !== existing.description) ||
        (body.ageLevels !== undefined &&
          JSON.stringify(body.ageLevels) !== JSON.stringify(existing.ageLevels)) ||
        (body.difficulty !== undefined && body.difficulty !== existing.difficulty) ||
        (body.timeOfYear !== undefined && body.timeOfYear !== existing.timeOfYear);

      if (updated.published && (publishing || bundleMetadataChanged)) {
        await bumpBoardsContentVersion(tx, [id]);
      }

      return updated;
    });

    if (!board) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    res.json(mapBoard(board));
  } catch (err) {
    req.log.error({ err }, "PATCH /boards/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /boards/:id
router.delete("/boards/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseBoardId(String(req.params.id));
  if (!id) {
    res.status(400).json({ error: "Invalid board id" });
    return;
  }

  try {
    const [board] = await db
      .delete(boardsTable)
      .where(eq(boardsTable.id, id))
      .returning();

    if (!board) {
      res.status(404).json({ error: "Board not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "DELETE /boards/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

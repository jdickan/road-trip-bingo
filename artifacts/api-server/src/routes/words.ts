import { Router, type IRouter } from "express";
import { eq, ilike, sql, and, or, isNull, isNotNull, inArray, exists } from "drizzle-orm";
import { db, wordsTable, boardsTable, wordBoardsTable } from "@workspace/db";
import {
  ListWordsQueryParams,
  ListWordsResponse,
  CreateWordBody,
  GetWordParams,
  GetWordResponse,
  UpdateWordParams,
  UpdateWordBody,
  UpdateWordResponse,
  DeleteWordParams,
  ExportWordsQueryParams,
  ExportWordsResponse,
  GetWordStatsResponse,
  ListDeletedWordsResponse,
  RestoreWordParams,
  RestoreWordResponse,
  BulkDeleteWordsBody,
  BulkDeleteWordsResponse,
  BulkRestoreWordsBody,
  BulkRestoreWordsResponse,
} from "@workspace/api-zod";
import { bumpBoardsContentVersion } from "../lib/content-version";

const router: IRouter = Router();

const MAX_LIMIT = 500;

function buildFilters(params: {
  search?: string;
  region?: string;
  surroundings?: string;
  age?: string;
  findability?: string;
  season?: string;
  boardId?: string;
  dayNight?: string;
  incomplete?: boolean;
  complete?: boolean;
}) {
  const conditions = [];

  /** Split a comma-separated filter string into trimmed non-empty values. */
  const split = (v?: string) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

  if (params.search) {
    conditions.push(ilike(wordsTable.word, `%${params.search}%`));
  }

  const regionVals = split(params.region);
  if (regionVals.length > 0) {
    conditions.push(
      or(...regionVals.map((v) => sql`${wordsTable.regions} @> ARRAY[${v}]::text[]`))
    );
  }

  const surroundingsVals = split(params.surroundings);
  if (surroundingsVals.length > 0) {
    conditions.push(
      or(...surroundingsVals.map((v) => sql`${wordsTable.surroundings} @> ARRAY[${v}]::text[]`))
    );
  }

  const ageVals = split(params.age);
  if (ageVals.length > 0) {
    conditions.push(or(...ageVals.map((v) => eq(wordsTable.age, v))));
  }

  const findabilityVals = split(params.findability);
  if (findabilityVals.length > 0) {
    conditions.push(or(...findabilityVals.map((v) => eq(wordsTable.findability, v))));
  }

  const seasonVals = split(params.season);
  if (seasonVals.length > 0) {
    conditions.push(
      or(...seasonVals.map((v) => sql`${wordsTable.seasons} @> ARRAY[${v}]::text[]`))
    );
  }

  const boardIdVals = split(params.boardId)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (boardIdVals.length > 0) {
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(wordBoardsTable)
          .where(
            and(
              eq(wordBoardsTable.wordId, wordsTable.id),
              inArray(wordBoardsTable.boardId, boardIdVals)
            )
          )
      )
    );
  }

  const dayNightVals = split(params.dayNight);
  if (dayNightVals.length > 0) {
    conditions.push(
      or(...dayNightVals.map((v) => sql`${wordsTable.dayNight} @> ARRAY[${v}]::text[]`))
    );
  }

  if (params.incomplete) {
    conditions.push(
      or(
        sql`${wordsTable.age} IS NULL`,
        sql`${wordsTable.findability} IS NULL`
      )
    );
  }

  if (params.complete) {
    conditions.push(
      and(
        sql`${wordsTable.age} IS NOT NULL`,
        sql`${wordsTable.findability} IS NOT NULL`
      )
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

type WordRow = typeof wordsTable.$inferSelect;
type BoardAssoc = { ids: number[]; names: string[] };
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function mapWordRow(row: WordRow, assoc?: BoardAssoc) {
  return {
    id: row.id,
    word: row.word,
    regions: row.regions ?? [],
    surroundings: row.surroundings ?? [],
    dayNight: row.dayNight ?? [],
    age: row.age ?? null,
    findability: row.findability ?? null,
    seasons: row.seasons ?? [],
    boards: assoc?.names ?? [],
    boardIds: assoc?.ids ?? [],
    notes: row.notes ?? null,
    spanish: row.spanish ?? null,
    emoji: row.emoji ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

/** Fetch board associations (ids + names, name-sorted) for a set of word IDs. */
async function getBoardAssociations(wordIds: number[]): Promise<Map<number, BoardAssoc>> {
  const map = new Map<number, BoardAssoc>();
  if (wordIds.length === 0) return map;
  const rows = await db
    .select({
      wordId: wordBoardsTable.wordId,
      boardId: wordBoardsTable.boardId,
      name: boardsTable.name,
    })
    .from(wordBoardsTable)
    .innerJoin(boardsTable, eq(wordBoardsTable.boardId, boardsTable.id))
    .where(inArray(wordBoardsTable.wordId, wordIds))
    .orderBy(boardsTable.name);
  for (const r of rows) {
    const entry = map.get(r.wordId) ?? { ids: [], names: [] };
    entry.ids.push(r.boardId);
    entry.names.push(r.name);
    map.set(r.wordId, entry);
  }
  return map;
}

/** Map an array of word rows to response objects, enriched with board associations. */
async function enrichWords(rows: WordRow[]) {
  const assoc = await getBoardAssociations(rows.map((r) => r.id));
  return rows.map((r) => mapWordRow(r, assoc.get(r.id)));
}

class UnknownBoardIdsError extends Error {
  constructor(public missingIds: number[]) {
    super(`Unknown board IDs: ${missingIds.join(", ")}`);
  }
}

/**
 * Resolve board IDs to {id, name} rows (name-sorted).
 * Throws UnknownBoardIdsError if any ID does not exist.
 */
async function resolveBoards(tx: DbOrTx, boardIds: number[]) {
  const uniqueIds = [...new Set(boardIds)];
  if (uniqueIds.length === 0) return [];
  const found = await tx
    .select({ id: boardsTable.id, name: boardsTable.name })
    .from(boardsTable)
    .where(inArray(boardsTable.id, uniqueIds))
    .orderBy(boardsTable.name);
  if (found.length !== uniqueIds.length) {
    const foundIds = new Set(found.map((b) => b.id));
    throw new UnknownBoardIdsError(uniqueIds.filter((i) => !foundIds.has(i)));
  }
  return found;
}

/** Fetch the distinct board IDs currently linked to any of the given words. */
async function getJunctionBoardIds(tx: DbOrTx, wordIds: number[]): Promise<number[]> {
  if (wordIds.length === 0) return [];
  const rows = await tx
    .select({ boardId: wordBoardsTable.boardId })
    .from(wordBoardsTable)
    .where(inArray(wordBoardsTable.wordId, wordIds));
  return [...new Set(rows.map((r) => r.boardId))];
}

/** Replace a word's junction rows with the given resolved boards. */
async function replaceWordBoards(
  tx: DbOrTx,
  wordId: number,
  boards: { id: number; name: string }[]
) {
  await tx.delete(wordBoardsTable).where(eq(wordBoardsTable.wordId, wordId));
  if (boards.length > 0) {
    await tx
      .insert(wordBoardsTable)
      .values(boards.map((b) => ({ wordId, boardId: b.id })));
  }
}

// GET /words
router.get("/words", async (req, res): Promise<void> => {
  const parsed = ListWordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, region, surroundings, age, findability, season, boardId, dayNight, incomplete, complete, offset = 0 } = parsed.data;
  const limit = Math.min(parsed.data.limit ?? 100, MAX_LIMIT);

  try {
    const userFilters = buildFilters({ search, region, surroundings, age, findability, season, boardId, dayNight, incomplete, complete });
    const where = userFilters ? and(isNull(wordsTable.deletedAt), userFilters) : isNull(wordsTable.deletedAt);

    const [words, countResult] = await Promise.all([
      db
        .select()
        .from(wordsTable)
        .where(where)
        .orderBy(wordsTable.word)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(wordsTable)
        .where(where),
    ]);

    const response = ListWordsResponse.parse({
      words: await enrichWords(words),
      total: countResult[0]?.count ?? 0,
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "GET /words failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /words/deleted — MUST be before /words/:id
router.get("/words/deleted", async (_req, res): Promise<void> => {
  try {
    const words = await db
      .select()
      .from(wordsTable)
      .where(isNotNull(wordsTable.deletedAt))
      .orderBy(wordsTable.deletedAt);

    const response = ListDeletedWordsResponse.parse({
      words: await enrichWords(words),
      total: words.length,
    });
    res.json(response);
  } catch (err) {
    res.log?.error({ err }, "GET /words/deleted failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /words/purge — MUST be before /words/:id
router.delete("/words/purge", async (req, res): Promise<void> => {
  try {
    await db
      .delete(wordsTable)
      .where(isNotNull(wordsTable.deletedAt));
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "DELETE /words/purge failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /words/export — MUST be before /words/:id
router.get("/words/export", async (req, res): Promise<void> => {
  const parsed = ExportWordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const { boardId, season, region, surroundings, age, findability } = parsed.data;
    const userFilters = buildFilters({ region, surroundings, age, findability, season, boardId });
    const where = userFilters ? and(isNull(wordsTable.deletedAt), userFilters) : isNull(wordsTable.deletedAt);

    const words = await db
      .select()
      .from(wordsTable)
      .where(where)
      .orderBy(wordsTable.word);

    const response = ExportWordsResponse.parse({
      words: await enrichWords(words),
      total: words.length,
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "GET /words/export failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /words/stats — MUST be before /words/:id
router.get("/words/stats", async (req, res): Promise<void> => {
  try {
    const allWords = await db
      .select()
      .from(wordsTable)
      .where(isNull(wordsTable.deletedAt));

    const byFindability: Record<string, number> = {};
    const byAge: Record<string, number> = {};
    const bySeason: Record<string, number> = {};
    const byBoard: Record<string, number> = {};
    const byRegion: Record<string, number> = {};
    const bySurroundings: Record<string, number> = {};
    const byDayNight: Record<string, number> = { "Day only": 0, "Night only": 0, "Day + Night": 0, "Unknown": 0 };

    let incomplete = 0;

    for (const w of allWords) {
      if (!w.age || !w.findability) incomplete++;

      if (w.findability) {
        byFindability[w.findability] = (byFindability[w.findability] ?? 0) + 1;
      } else {
        byFindability["Unknown"] = (byFindability["Unknown"] ?? 0) + 1;
      }

      if (w.age) {
        byAge[w.age] = (byAge[w.age] ?? 0) + 1;
      } else {
        byAge["Unknown"] = (byAge["Unknown"] ?? 0) + 1;
      }

      for (const s of w.seasons ?? []) {
        bySeason[s] = (bySeason[s] ?? 0) + 1;
      }
      for (const r of w.regions ?? []) {
        byRegion[r] = (byRegion[r] ?? 0) + 1;
      }
      for (const sr of w.surroundings ?? []) {
        bySurroundings[sr] = (bySurroundings[sr] ?? 0) + 1;
      }

      const dn = w.dayNight ?? [];
      const hasDay = dn.includes("Day");
      const hasNight = dn.includes("Night");
      if (hasDay && hasNight) byDayNight["Day + Night"]++;
      else if (hasDay)        byDayNight["Day only"]++;
      else if (hasNight)      byDayNight["Night only"]++;
      else                    byDayNight["Unknown"]++;
    }

    const boardCounts = await db
      .select({ name: boardsTable.name, count: sql<number>`count(*)::int` })
      .from(wordBoardsTable)
      .innerJoin(boardsTable, eq(wordBoardsTable.boardId, boardsTable.id))
      .innerJoin(wordsTable, eq(wordBoardsTable.wordId, wordsTable.id))
      .where(isNull(wordsTable.deletedAt))
      .groupBy(boardsTable.name);
    for (const bc of boardCounts) {
      byBoard[bc.name] = bc.count;
    }

    const response = GetWordStatsResponse.parse({
      total: allWords.length,
      incomplete,
      byFindability,
      byAge,
      bySeason,
      byBoard,
      byRegion,
      bySurroundings,
      byDayNight,
    });
    res.json(response);
  } catch (err) {
    req.log.error({ err }, "GET /words/stats failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /words
router.post("/words", async (req, res): Promise<void> => {
  const parsed = CreateWordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const body = parsed.data;
    const created = await db.transaction(async (tx) => {
      const boards = await resolveBoards(tx, body.boardIds ?? []);
      const [word] = await tx
        .insert(wordsTable)
        .values({
          word: body.word,
          regions: body.regions ?? ["All"],
          surroundings: body.surroundings ?? [],
          dayNight: body.dayNight ?? ["Day"],
          age: body.age ?? null,
          findability: body.findability ?? null,
          seasons: body.seasons ?? ["All"],
          boards: boards.map((b) => b.name),
          notes: body.notes ?? null,
          spanish: body.spanish ?? null,
          emoji: body.emoji ?? null,
        })
        .returning();
      await replaceWordBoards(tx, word.id, boards);
      // New word content appears in these boards' /v1 bundles.
      await bumpBoardsContentVersion(tx, boards.map((b) => b.id));
      return mapWordRow(word, {
        ids: boards.map((b) => b.id),
        names: boards.map((b) => b.name),
      });
    });

    res.status(201).json(GetWordResponse.parse(created));
  } catch (err) {
    if (err instanceof UnknownBoardIdsError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "POST /words failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /words/bulk-delete — MUST be before /words/:id
router.post("/words/bulk-delete", async (req, res): Promise<void> => {
  const parsed = BulkDeleteWordsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { ids } = parsed.data;
  if (ids.length === 0) {
    res.json(BulkDeleteWordsResponse.parse({ count: 0 }));
    return;
  }
  try {
    const count = await db.transaction(async (tx) => {
      const rows = await tx
        .update(wordsTable)
        .set({ deletedAt: new Date() })
        .where(and(inArray(wordsTable.id, ids), isNull(wordsTable.deletedAt)))
        .returning({ id: wordsTable.id });
      await bumpBoardsContentVersion(
        tx,
        await getJunctionBoardIds(tx, rows.map((r) => r.id)),
      );
      return rows.length;
    });
    res.json(BulkDeleteWordsResponse.parse({ count }));
  } catch (err) {
    req.log.error({ err }, "POST /words/bulk-delete failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /words/bulk-restore — MUST be before /words/:id
router.post("/words/bulk-restore", async (req, res): Promise<void> => {
  const parsed = BulkRestoreWordsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { ids } = parsed.data;
  if (ids.length === 0) {
    res.json(BulkRestoreWordsResponse.parse({ count: 0 }));
    return;
  }
  try {
    const count = await db.transaction(async (tx) => {
      const rows = await tx
        .update(wordsTable)
        .set({ deletedAt: null })
        .where(and(inArray(wordsTable.id, ids), isNotNull(wordsTable.deletedAt)))
        .returning({ id: wordsTable.id });
      await bumpBoardsContentVersion(
        tx,
        await getJunctionBoardIds(tx, rows.map((r) => r.id)),
      );
      return rows.length;
    });
    res.json(BulkRestoreWordsResponse.parse({ count }));
  } catch (err) {
    req.log.error({ err }, "POST /words/bulk-restore failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /words/:id/restore — MUST be before /words/:id
router.post("/words/:id/restore", async (req, res): Promise<void> => {
  const params = RestoreWordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const word = await db.transaction(async (tx) => {
      const [w] = await tx
        .update(wordsTable)
        .set({ deletedAt: null })
        .where(and(eq(wordsTable.id, params.data.id), isNotNull(wordsTable.deletedAt)))
        .returning();
      if (!w) return null;
      // Restored words reappear in /v1 bundles.
      await bumpBoardsContentVersion(tx, await getJunctionBoardIds(tx, [w.id]));
      return w;
    });

    if (!word) {
      res.status(404).json({ error: "Deleted word not found" });
      return;
    }

    const [enriched] = await enrichWords([word]);
    res.json(RestoreWordResponse.parse(enriched));
  } catch (err) {
    req.log.error({ err }, "POST /words/:id/restore failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /words/:id
router.get("/words/:id", async (req, res): Promise<void> => {
  const params = GetWordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [word] = await db
      .select()
      .from(wordsTable)
      .where(and(eq(wordsTable.id, params.data.id), isNull(wordsTable.deletedAt)));

    if (!word) {
      res.status(404).json({ error: "Word not found" });
      return;
    }

    const [enriched] = await enrichWords([word]);
    res.json(GetWordResponse.parse(enriched));
  } catch (err) {
    req.log.error({ err }, "GET /words/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /words/:id
router.patch("/words/:id", async (req, res): Promise<void> => {
  const params = UpdateWordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateWordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const updateData: Partial<typeof wordsTable.$inferInsert> = {};
    if (parsed.data.word !== undefined) updateData.word = parsed.data.word;
    if (parsed.data.regions !== undefined) updateData.regions = parsed.data.regions;
    if (parsed.data.surroundings !== undefined) updateData.surroundings = parsed.data.surroundings;
    if (parsed.data.dayNight !== undefined) updateData.dayNight = parsed.data.dayNight;
    if (parsed.data.age !== undefined) updateData.age = parsed.data.age;
    if (parsed.data.findability !== undefined) updateData.findability = parsed.data.findability;
    if (parsed.data.seasons !== undefined) updateData.seasons = parsed.data.seasons;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
    if (parsed.data.spanish !== undefined) updateData.spanish = parsed.data.spanish;
    if (parsed.data.emoji !== undefined) updateData.emoji = parsed.data.emoji;

    const boardIds = parsed.data.boardIds;

    // Bundle-visible word fields — edits to these change what /v1 bundles
    // serve, so they must bump the linked published boards' contentVersion.
    // `notes` is editorial-only and deliberately excluded.
    const contentFieldChanged =
      parsed.data.word !== undefined ||
      parsed.data.regions !== undefined ||
      parsed.data.surroundings !== undefined ||
      parsed.data.dayNight !== undefined ||
      parsed.data.age !== undefined ||
      parsed.data.findability !== undefined ||
      parsed.data.seasons !== undefined ||
      parsed.data.spanish !== undefined ||
      parsed.data.emoji !== undefined;

    const updated = await db.transaction(async (tx) => {
      let boards: { id: number; name: string }[] | undefined;
      if (boardIds !== undefined) {
        boards = await resolveBoards(tx, boardIds);
        updateData.boards = boards.map((b) => b.name);
      }

      const oldBoardIds = await getJunctionBoardIds(tx, [params.data.id]);

      const [word] = await tx
        .update(wordsTable)
        .set(updateData)
        .where(and(eq(wordsTable.id, params.data.id), isNull(wordsTable.deletedAt)))
        .returning();

      if (!word) return null;

      if (boards !== undefined) {
        await replaceWordBoards(tx, word.id, boards);
      }

      const newBoardIds = boards !== undefined ? boards.map((b) => b.id) : oldBoardIds;
      const membershipChanged =
        boards !== undefined &&
        JSON.stringify([...oldBoardIds].sort((a, b) => a - b)) !==
          JSON.stringify([...newBoardIds].sort((a, b) => a - b));

      if (contentFieldChanged || membershipChanged) {
        // Union of old ∪ new: a board the word left must also re-version.
        await bumpBoardsContentVersion(tx, [...oldBoardIds, ...newBoardIds]);
      }
      return word;
    });

    if (!updated) {
      res.status(404).json({ error: "Word not found" });
      return;
    }

    const [enriched] = await enrichWords([updated]);
    res.json(UpdateWordResponse.parse(enriched));
  } catch (err) {
    if (err instanceof UnknownBoardIdsError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "PATCH /words/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /words/:id — soft-delete
router.delete("/words/:id", async (req, res): Promise<void> => {
  const params = DeleteWordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const word = await db.transaction(async (tx) => {
      const [w] = await tx
        .update(wordsTable)
        .set({ deletedAt: new Date() })
        .where(and(eq(wordsTable.id, params.data.id), isNull(wordsTable.deletedAt)))
        .returning();
      if (!w) return null;
      // Soft-deleted words disappear from /v1 bundles.
      await bumpBoardsContentVersion(tx, await getJunctionBoardIds(tx, [w.id]));
      return w;
    });

    if (!word) {
      res.status(404).json({ error: "Word not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "DELETE /words/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { eq, ilike, sql, and, or, isNull, isNotNull, inArray } from "drizzle-orm";
import { db, wordsTable } from "@workspace/db";
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

const router: IRouter = Router();

function buildFilters(params: {
  search?: string;
  region?: string;
  surroundings?: string;
  age?: string;
  findability?: string;
  season?: string;
  board?: string;
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

  const boardVals = split(params.board);
  if (boardVals.length > 0) {
    conditions.push(
      or(...boardVals.map((v) => sql`${wordsTable.boards} @> ARRAY[${v}]::text[]`))
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

function mapWordRow(row: typeof wordsTable.$inferSelect) {
  return {
    id: row.id,
    word: row.word,
    regions: row.regions ?? [],
    surroundings: row.surroundings ?? [],
    dayNight: row.dayNight ?? [],
    age: row.age ?? null,
    findability: row.findability ?? null,
    seasons: row.seasons ?? [],
    boards: row.boards ?? [],
    notes: row.notes ?? null,
    spanish: row.spanish ?? null,
    emoji: row.emoji ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

// GET /words
router.get("/words", async (req, res): Promise<void> => {
  const parsed = ListWordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, region, surroundings, age, findability, season, board, dayNight, incomplete, complete, limit = 1000, offset = 0 } = parsed.data;

  const userFilters = buildFilters({ search, region, surroundings, age, findability, season, board, dayNight, incomplete, complete });
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
    words: words.map(mapWordRow),
    total: countResult[0]?.count ?? 0,
  });
  res.json(response);
});

// GET /words/deleted — MUST be before /words/:id
router.get("/words/deleted", async (_req, res): Promise<void> => {
  const words = await db
    .select()
    .from(wordsTable)
    .where(isNotNull(wordsTable.deletedAt))
    .orderBy(wordsTable.deletedAt);

  const response = ListDeletedWordsResponse.parse({
    words: words.map(mapWordRow),
    total: words.length,
  });
  res.json(response);
});

// DELETE /words/purge — MUST be before /words/:id
router.delete("/words/purge", async (_req, res): Promise<void> => {
  await db
    .delete(wordsTable)
    .where(isNotNull(wordsTable.deletedAt));
  res.sendStatus(204);
});

// GET /words/export — MUST be before /words/:id
router.get("/words/export", async (req, res): Promise<void> => {
  const parsed = ExportWordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { board, season, region, surroundings, age, findability } = parsed.data;
  const userFilters = buildFilters({ region, surroundings, age, findability, season, board });
  const where = userFilters ? and(isNull(wordsTable.deletedAt), userFilters) : isNull(wordsTable.deletedAt);

  const words = await db
    .select()
    .from(wordsTable)
    .where(where)
    .orderBy(wordsTable.word);

  const response = ExportWordsResponse.parse({
    words: words.map(mapWordRow),
    total: words.length,
  });
  res.json(response);
});

// GET /words/stats — MUST be before /words/:id
router.get("/words/stats", async (_req, res): Promise<void> => {
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
    for (const b of w.boards ?? []) {
      byBoard[b] = (byBoard[b] ?? 0) + 1;
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
});

// POST /words
router.post("/words", async (req, res): Promise<void> => {
  const parsed = CreateWordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [word] = await db
    .insert(wordsTable)
    .values({
      word: parsed.data.word,
      regions: parsed.data.regions ?? ["All"],
      surroundings: parsed.data.surroundings ?? [],
      dayNight: parsed.data.dayNight ?? ["Day"],
      age: parsed.data.age ?? null,
      findability: parsed.data.findability ?? null,
      seasons: parsed.data.seasons ?? ["All"],
      boards: parsed.data.boards ?? [],
      notes: parsed.data.notes ?? null,
      spanish: parsed.data.spanish ?? null,
      emoji: parsed.data.emoji ?? null,
    })
    .returning();

  res.status(201).json(GetWordResponse.parse(mapWordRow(word)));
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
  const rows = await db
    .update(wordsTable)
    .set({ deletedAt: new Date() })
    .where(and(inArray(wordsTable.id, ids), isNull(wordsTable.deletedAt)))
    .returning({ id: wordsTable.id });
  res.json(BulkDeleteWordsResponse.parse({ count: rows.length }));
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
  const rows = await db
    .update(wordsTable)
    .set({ deletedAt: null })
    .where(and(inArray(wordsTable.id, ids), isNotNull(wordsTable.deletedAt)))
    .returning({ id: wordsTable.id });
  res.json(BulkRestoreWordsResponse.parse({ count: rows.length }));
});

// POST /words/:id/restore — MUST be before /words/:id
router.post("/words/:id/restore", async (req, res): Promise<void> => {
  const params = RestoreWordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [word] = await db
    .update(wordsTable)
    .set({ deletedAt: null })
    .where(and(eq(wordsTable.id, params.data.id), isNotNull(wordsTable.deletedAt)))
    .returning();

  if (!word) {
    res.status(404).json({ error: "Deleted word not found" });
    return;
  }

  res.json(RestoreWordResponse.parse(mapWordRow(word)));
});

// GET /words/:id
router.get("/words/:id", async (req, res): Promise<void> => {
  const params = GetWordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [word] = await db
    .select()
    .from(wordsTable)
    .where(and(eq(wordsTable.id, params.data.id), isNull(wordsTable.deletedAt)));

  if (!word) {
    res.status(404).json({ error: "Word not found" });
    return;
  }

  res.json(GetWordResponse.parse(mapWordRow(word)));
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

  const updateData: Partial<typeof wordsTable.$inferInsert> = {};
  if (parsed.data.word !== undefined) updateData.word = parsed.data.word;
  if (parsed.data.regions !== undefined) updateData.regions = parsed.data.regions;
  if (parsed.data.surroundings !== undefined) updateData.surroundings = parsed.data.surroundings;
  if (parsed.data.dayNight !== undefined) updateData.dayNight = parsed.data.dayNight;
  if (parsed.data.age !== undefined) updateData.age = parsed.data.age;
  if (parsed.data.findability !== undefined) updateData.findability = parsed.data.findability;
  if (parsed.data.seasons !== undefined) updateData.seasons = parsed.data.seasons;
  if (parsed.data.boards !== undefined) updateData.boards = parsed.data.boards;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;
  if (parsed.data.spanish !== undefined) updateData.spanish = parsed.data.spanish;
  if (parsed.data.emoji !== undefined) updateData.emoji = parsed.data.emoji;

  const [word] = await db
    .update(wordsTable)
    .set(updateData)
    .where(and(eq(wordsTable.id, params.data.id), isNull(wordsTable.deletedAt)))
    .returning();

  if (!word) {
    res.status(404).json({ error: "Word not found" });
    return;
  }

  res.json(UpdateWordResponse.parse(mapWordRow(word)));
});

// DELETE /words/:id — soft-delete
router.delete("/words/:id", async (req, res): Promise<void> => {
  const params = DeleteWordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [word] = await db
    .update(wordsTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(wordsTable.id, params.data.id), isNull(wordsTable.deletedAt)))
    .returning();

  if (!word) {
    res.status(404).json({ error: "Word not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

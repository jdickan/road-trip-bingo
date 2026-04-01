import { Router, type IRouter } from "express";
import { eq, ilike, sql, and, or } from "drizzle-orm";
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
}) {
  const conditions = [];

  if (params.search) {
    conditions.push(ilike(wordsTable.word, `%${params.search}%`));
  }
  if (params.region && params.region !== "All") {
    conditions.push(
      or(
        sql`${wordsTable.regions} @> ARRAY[${params.region}]::text[]`,
        sql`${wordsTable.regions} @> ARRAY['All']::text[]`
      )
    );
  }
  if (params.surroundings && params.surroundings !== "All") {
    conditions.push(
      or(
        sql`${wordsTable.surroundings} @> ARRAY[${params.surroundings}]::text[]`,
        sql`${wordsTable.surroundings} @> ARRAY['All']::text[]`
      )
    );
  }
  if (params.age) {
    conditions.push(eq(wordsTable.age, params.age));
  }
  if (params.findability) {
    conditions.push(eq(wordsTable.findability, params.findability));
  }
  if (params.season && params.season !== "All") {
    conditions.push(
      or(
        sql`${wordsTable.seasons} @> ARRAY[${params.season}]::text[]`,
        sql`${wordsTable.seasons} @> ARRAY['All']::text[]`
      )
    );
  }
  if (params.board) {
    conditions.push(sql`${wordsTable.boards} @> ARRAY[${params.board}]::text[]`);
  }
  if (params.dayNight) {
    conditions.push(sql`${wordsTable.dayNight} @> ARRAY[${params.dayNight}]::text[]`);
  }
  if (params.incomplete) {
    conditions.push(
      or(
        sql`${wordsTable.age} IS NULL`,
        sql`${wordsTable.findability} IS NULL`
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// GET /words
router.get("/words", async (req, res): Promise<void> => {
  const parsed = ListWordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, region, surroundings, age, findability, season, board, dayNight, incomplete, limit = 1000, offset = 0 } = parsed.data;

  const where = buildFilters({ search, region, surroundings, age, findability, season, board, dayNight, incomplete });

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

// GET /words/export — MUST be before /words/:id
router.get("/words/export", async (req, res): Promise<void> => {
  const parsed = ExportWordsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { board, season, region, age, findability } = parsed.data;
  const where = buildFilters({ region, age, findability, season, board });

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
  const allWords = await db.select().from(wordsTable);

  const byFindability: Record<string, number> = {};
  const byAge: Record<string, number> = {};
  const bySeason: Record<string, number> = {};
  const byBoard: Record<string, number> = {};
  const byRegion: Record<string, number> = {};

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
  }

  const response = GetWordStatsResponse.parse({
    total: allWords.length,
    incomplete,
    byFindability,
    byAge,
    bySeason,
    byBoard,
    byRegion,
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
    })
    .returning();

  res.status(201).json(GetWordResponse.parse(mapWordRow(word)));
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
    .where(eq(wordsTable.id, params.data.id));

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

  const [word] = await db
    .update(wordsTable)
    .set(updateData)
    .where(eq(wordsTable.id, params.data.id))
    .returning();

  if (!word) {
    res.status(404).json({ error: "Word not found" });
    return;
  }

  res.json(UpdateWordResponse.parse(mapWordRow(word)));
});

// DELETE /words/:id
router.delete("/words/:id", async (req, res): Promise<void> => {
  const params = DeleteWordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [word] = await db
    .delete(wordsTable)
    .where(eq(wordsTable.id, params.data.id))
    .returning();

  if (!word) {
    res.status(404).json({ error: "Word not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

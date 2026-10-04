import { Router, type IRouter } from "express";
import { eq, isNull, or, sql, inArray } from "drizzle-orm";
import { db, wordsTable, boardsTable, wordBoardsTable } from "@workspace/db";
import {
  AutofillWordsBody,
  AutofillWordsResponse,
  SuggestWordsBody,
  SuggestWordsResponse,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";
import { bumpBoardsContentVersion } from "../lib/content-version";

const router: IRouter = Router();

const VALID_REGIONS = ["All", "NE", "SE", "N Cent", "S Cent", "NW + AK", "SW + HI"];
const VALID_SURROUNDINGS = ["All", "Rural / Xurban", "Suburban / Town", "Urban / City", "Highway", "Coast"];
const VALID_DAY_NIGHT = ["Day", "Night"];
const VALID_AGES = ["Young", "Kid", "Tween"];
const VALID_FINDABILITIES = ["High", "Medium", "Low"];
const VALID_SEASONS = ["All", "Spring", "Summer", "Fall", "Winter"];

/** Build field descriptions using the live board list from the database. */
function buildFieldDescriptionMap(validBoardNames: string[]) {
  return {
    regions: `Geographic regions in the US where this thing is commonly found. Valid values: ${VALID_REGIONS.join(", ")}. Use "All" if found everywhere, otherwise list the specific regions.`,
    surroundings: `What type of surroundings/environment this thing appears in. Valid values: ${VALID_SURROUNDINGS.join(", ")}. Can have multiple. Use "All" if ubiquitous.`,
    dayNight: `Whether this thing is visible day, night, or both. Valid values: ${VALID_DAY_NIGHT.join(", ")}. Default to ["Day"] for most things.`,
    age: `The age group most likely to find this interesting/challenging. Valid values: ${VALID_AGES.join(", ")} (single value only). Young=toddler/preschool simple objects, Kid=school-age, Tween=older kids/teens harder items.`,
    findability: `How easy or hard this thing is to find on a road trip. Valid values: ${VALID_FINDABILITIES.join(", ")} (single value only). High=very common, Medium=sometimes seen, Low=rare.`,
    seasons: `What seasons this thing is typically available/visible. Valid values: ${VALID_SEASONS.join(", ")}. Can have multiple.`,
    boards: `Which bingo board themes this word fits on. Valid values: ${validBoardNames.join(", ")}. Can have multiple.`,
  };
}

// Concurrency guard: allow only one AI request in-flight at a time.
// The lock is claimed immediately at handler entry — before any DB or OpenAI
// work — so concurrent requests are rejected at the gate, not just before the
// actual model call.
let aiRequestInFlight = false;

// POST /ai/autofill
router.post("/ai/autofill", async (req, res): Promise<void> => {
  if (aiRequestInFlight) {
    res.status(429).json({ error: "An AI request is already in progress. Please wait and try again." });
    return;
  }
  aiRequestInFlight = true;

  try {
    const parsed = AutofillWordsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { wordIds, fields } = parsed.data;

    if (!fields || fields.length === 0) {
      res.status(400).json({ error: "At least one field must be specified" });
      return;
    }

    // Get words to fill
    let wordsToFill;
    if (wordIds && wordIds.length > 0) {
      // Schema already enforces maxItems: 50 — enforce hard cap here as defence-in-depth
      const cappedIds = wordIds.slice(0, 50);
      wordsToFill = await db
        .select()
        .from(wordsTable)
        .where(
          cappedIds.length === 1
            ? eq(wordsTable.id, cappedIds[0])
            : or(...cappedIds.map((id) => eq(wordsTable.id, id)))
        );
      // Respect the 50-word cap even when IDs are explicitly supplied
      wordsToFill = wordsToFill.slice(0, 50);
    } else {
      // Fill all words that are missing values for the requested fields
      const nullConditions = [];
      for (const field of fields) {
        // Array columns are NOT NULL with defaults — check cardinality=0 (empty) as well as IS NULL
        // Scalar columns (age, findability) are nullable — IS NULL is correct
        if (field === "regions")           nullConditions.push(or(isNull(wordsTable.regions),      sql`cardinality(${wordsTable.regions}) = 0`));
        else if (field === "surroundings") nullConditions.push(or(isNull(wordsTable.surroundings), sql`cardinality(${wordsTable.surroundings}) = 0`));
        else if (field === "dayNight")     nullConditions.push(or(isNull(wordsTable.dayNight),     sql`cardinality(${wordsTable.dayNight}) = 0`));
        else if (field === "seasons")      nullConditions.push(or(isNull(wordsTable.seasons),      sql`cardinality(${wordsTable.seasons}) = 0`));
        else if (field === "boards")       nullConditions.push(sql`NOT EXISTS (SELECT 1 FROM bingo_word_boards wb WHERE wb.word_id = ${wordsTable.id})`);
        else if (field === "age")          nullConditions.push(isNull(wordsTable.age));
        else if (field === "findability")  nullConditions.push(isNull(wordsTable.findability));
      }
      wordsToFill = await db
        .select()
        .from(wordsTable)
        .where(nullConditions.length > 0 ? or(...nullConditions) : undefined);
      // Limit to 50 per batch — run autofill again to continue filling remaining words
      wordsToFill = wordsToFill.slice(0, 50);
    }

    if (wordsToFill.length === 0) {
      const response = AutofillWordsResponse.parse({ updated: 0, results: [] });
      res.json(response);
      return;
    }

    // Live board list from the database — source of truth for valid board values
    const liveBoards = await db
      .select({ id: boardsTable.id, name: boardsTable.name })
      .from(boardsTable)
      .orderBy(boardsTable.name);
    const boardIdByName = new Map(liveBoards.map((b) => [b.name, b.id]));
    const validBoardNames = liveBoards.map((b) => b.name);

    // Current board associations (from the junction table) for the words being filled
    const assocRows = await db
      .select({
        wordId: wordBoardsTable.wordId,
        boardId: wordBoardsTable.boardId,
        name: boardsTable.name,
      })
      .from(wordBoardsTable)
      .innerJoin(boardsTable, eq(wordBoardsTable.boardId, boardsTable.id))
      .where(inArray(wordBoardsTable.wordId, wordsToFill.map((w) => w.id)))
      .orderBy(boardsTable.name);
    const assocByWord = new Map<number, { ids: number[]; names: string[] }>();
    for (const r of assocRows) {
      const entry = assocByWord.get(r.wordId) ?? { ids: [], names: [] };
      entry.ids.push(r.boardId);
      entry.names.push(r.name);
      assocByWord.set(r.wordId, entry);
    }

    // Build field descriptions for requested fields
    const fieldDescriptionMap = buildFieldDescriptionMap(validBoardNames);
    const fieldDescriptions = fields
      .map((f) => `- ${f}: ${fieldDescriptionMap[f as keyof typeof fieldDescriptionMap] ?? f}`)
      .join("\n");

    const wordsList = wordsToFill.map((w) => ({
      id: w.id,
      word: w.word,
      currentValues: {
        regions: w.regions,
        surroundings: w.surroundings,
        dayNight: w.dayNight,
        age: w.age,
        findability: w.findability,
        seasons: w.seasons,
        boards: assocByWord.get(w.id)?.names ?? [],
      },
    }));

    const systemPrompt = `You are an expert at categorizing items for a road trip bingo game. 
You will be given a list of bingo words/phrases and need to fill in their metadata tags.
This is for a road trip bingo game where players look for things out the car window while traveling.

Fields to fill in:
${fieldDescriptions}

For each word, only provide values for the requested fields. 
Return a JSON array of objects with "id" and the requested field values.
Only use the exact valid values listed above.
For array fields, return an array. For single-value fields (age, findability), return a string or null.

Example response format for fields ["age", "findability", "regions"]:
[
  { "id": 1, "age": "Kid", "findability": "High", "regions": ["All"] },
  { "id": 2, "age": "Tween", "findability": "Low", "regions": ["NE", "SE"] }
]`;

    const userPrompt = `Fill in the metadata for these road trip bingo words. Fields to fill: ${fields.join(", ")}.

Words to process:
${JSON.stringify(wordsList, null, 2)}

Return only the JSON array, no explanation.`;

    let aiResults: Array<Record<string, unknown>>;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.4-mini",
        max_completion_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content ?? "[]";
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsedAi: unknown = JSON.parse(cleaned);
      if (!Array.isArray(parsedAi)) {
        logger.error({ parsedAi }, "AI autofill returned non-array response");
        res.status(500).json({ error: "AI processing failed" });
        return;
      }
      aiResults = parsedAi as Array<Record<string, unknown>>;
    } catch (err) {
      logger.error({ err }, "AI autofill failed");
      res.status(500).json({ error: "AI processing failed" });
      return;
    }

    // Build a set of valid word IDs so AI can't hallucinate updates to other words
    const validWordIds = new Set(wordsToFill.map((w) => w.id));

    // Helper: filter an array field to valid string values, logging any dropped members
    function filterArrayField(
      id: number,
      field: string,
      raw: unknown[],
      validSet: string[]
    ): string[] {
      const valid: string[] = [];
      const dropped: unknown[] = [];
      for (const v of raw) {
        if (typeof v === "string" && validSet.includes(v)) {
          valid.push(v);
        } else {
          dropped.push(v);
        }
      }
      if (dropped.length > 0) {
        logger.warn({ id, field, dropped }, "AI autofill dropped invalid array elements");
      }
      return valid;
    }

    // Apply updates
    const updatedWords = [];
    for (const result of aiResults) {
      // Guard against null or non-object elements (e.g. a malformed AI response like [null, 1, "foo"])
      if (result === null || typeof result !== "object" || Array.isArray(result)) {
        logger.warn({ result }, "AI autofill skipping non-object element in response array");
        continue;
      }

      const { id: rawId, ...updates } = result;

      if (typeof rawId !== "number" || !Number.isInteger(rawId)) {
        logger.warn({ rawId }, "AI autofill skipping result with invalid id type");
        continue;
      }
      const id = rawId;
      if (!validWordIds.has(id)) {
        logger.warn({ id }, "AI autofill skipping result with id not in requested set");
        continue;
      }

      const updateData: Partial<typeof wordsTable.$inferInsert> = {};

      if (fields.includes("regions") && updates.regions !== undefined) {
        if (!Array.isArray(updates.regions)) {
          logger.warn({ id, value: updates.regions }, "AI autofill skipping regions: expected array");
        } else {
          const filtered = filterArrayField(id, "regions", updates.regions as unknown[], VALID_REGIONS);
          if (filtered.length > 0) updateData.regions = filtered;
        }
      }
      if (fields.includes("surroundings") && updates.surroundings !== undefined) {
        if (!Array.isArray(updates.surroundings)) {
          logger.warn({ id, value: updates.surroundings }, "AI autofill skipping surroundings: expected array");
        } else {
          const filtered = filterArrayField(id, "surroundings", updates.surroundings as unknown[], VALID_SURROUNDINGS);
          if (filtered.length > 0) updateData.surroundings = filtered;
        }
      }
      if (fields.includes("dayNight") && updates.dayNight !== undefined) {
        if (!Array.isArray(updates.dayNight)) {
          logger.warn({ id, value: updates.dayNight }, "AI autofill skipping dayNight: expected array");
        } else {
          const filtered = filterArrayField(id, "dayNight", updates.dayNight as unknown[], VALID_DAY_NIGHT);
          if (filtered.length > 0) updateData.dayNight = filtered;
        }
      }
      if (fields.includes("age") && updates.age !== undefined) {
        if (updates.age === null) {
          updateData.age = null;
        } else if (typeof updates.age !== "string") {
          logger.warn({ id, value: updates.age }, "AI autofill skipping age: expected string or null");
        } else if (!VALID_AGES.includes(updates.age)) {
          logger.warn({ id, value: updates.age }, "AI autofill skipping age: invalid value");
        } else {
          updateData.age = updates.age;
        }
      }
      if (fields.includes("findability") && updates.findability !== undefined) {
        if (updates.findability === null) {
          updateData.findability = null;
        } else if (typeof updates.findability !== "string") {
          logger.warn({ id, value: updates.findability }, "AI autofill skipping findability: expected string or null");
        } else if (!VALID_FINDABILITIES.includes(updates.findability)) {
          logger.warn({ id, value: updates.findability }, "AI autofill skipping findability: invalid value");
        } else {
          updateData.findability = updates.findability;
        }
      }
      if (fields.includes("seasons") && updates.seasons !== undefined) {
        if (!Array.isArray(updates.seasons)) {
          logger.warn({ id, value: updates.seasons }, "AI autofill skipping seasons: expected array");
        } else {
          const filtered = filterArrayField(id, "seasons", updates.seasons as unknown[], VALID_SEASONS);
          if (filtered.length > 0) updateData.seasons = filtered;
        }
      }
      let newBoards: { id: number; name: string }[] | undefined;
      if (fields.includes("boards") && updates.boards !== undefined) {
        if (!Array.isArray(updates.boards)) {
          logger.warn({ id, value: updates.boards }, "AI autofill skipping boards: expected array");
        } else {
          const filtered = filterArrayField(id, "boards", updates.boards as unknown[], validBoardNames);
          if (filtered.length > 0) {
            newBoards = filtered.map((name) => ({ id: boardIdByName.get(name)!, name }));
            updateData.boards = newBoards.map((b) => b.name);
          }
        }
      }

      if (Object.keys(updateData).length === 0) continue;

      const updated = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(wordsTable)
          .set(updateData)
          .where(eq(wordsTable.id, id))
          .returning();
        if (row && newBoards !== undefined) {
          await tx.delete(wordBoardsTable).where(eq(wordBoardsTable.wordId, id));
          if (newBoards.length > 0) {
            await tx
              .insert(wordBoardsTable)
              .values(newBoards.map((b) => ({ wordId: id, boardId: b.id })));
          }
        }
        if (row) {
          // Every autofill field is bundle-visible content, so any update
          // must bump the linked published boards' contentVersion.  Union of
          // old ∪ new membership: boards the word left must re-version too.
          const oldBoardIds = assocByWord.get(id)?.ids ?? [];
          const newBoardIds = newBoards !== undefined ? newBoards.map((b) => b.id) : oldBoardIds;
          await bumpBoardsContentVersion(tx, [...oldBoardIds, ...newBoardIds]);
        }
        return row;
      });

      if (updated) {
        const assoc = newBoards !== undefined
          ? { ids: newBoards.map((b) => b.id), names: newBoards.map((b) => b.name) }
          : assocByWord.get(id) ?? { ids: [], names: [] };
        updatedWords.push({
          id: updated.id,
          word: updated.word,
          regions: updated.regions ?? [],
          surroundings: updated.surroundings ?? [],
          dayNight: updated.dayNight ?? [],
          age: updated.age ?? null,
          findability: updated.findability ?? null,
          seasons: updated.seasons ?? [],
          boards: assoc.names,
          boardIds: assoc.ids,
          notes: updated.notes ?? null,
          spanish: updated.spanish ?? null,
          emoji: updated.emoji ?? null,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
          deletedAt: updated.deletedAt ?? null,
        });
      }
    }

    const response = AutofillWordsResponse.parse({
      updated: updatedWords.length,
      results: updatedWords,
    });
    res.json(response);
  } finally {
    aiRequestInFlight = false;
  }
});

// POST /ai/suggest
router.post("/ai/suggest", async (req, res): Promise<void> => {
  if (aiRequestInFlight) {
    res.status(429).json({ error: "An AI request is already in progress. Please wait and try again." });
    return;
  }
  aiRequestInFlight = true;

  try {
    const parsed = SuggestWordsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    // Schema enforces count max 20 and theme maxLength 200
    const { theme, count = 10 } = parsed.data;

    const existingWords = await db.select({ word: wordsTable.word }).from(wordsTable);
    const existingList = existingWords.map((w) => w.word).join(", ");

    const systemPrompt = `You are an expert at creating road trip bingo games. 
Suggest creative, fun, and findable things that players can look for out the car window while on a road trip.
Avoid duplicating the existing words in the database.`;

    const userPrompt = `Suggest ${count} new road trip bingo words/phrases${theme ? ` with the theme: "${theme}"` : ""}.

Existing words (do not duplicate): ${existingList.substring(0, 2000)}...

For each word, provide:
1. The word/phrase itself (should be concise, 1-5 words)
2. A brief rationale for why it's good for road trip bingo

Return a JSON array like:
[
  { "word": "Red Barn", "rationale": "Common sight in rural areas, easy enough for young kids" },
  { "word": "Wind Turbine", "rationale": "Increasingly common, recognizable from a distance" }
]

Return only the JSON array, no other text.`;

    let suggestions: Array<{ word: string; rationale: string }>;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.4-mini",
        max_completion_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content ?? "[]";
      const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
      const parsedAi: unknown = JSON.parse(cleaned);
      if (!Array.isArray(parsedAi)) {
        logger.error({ parsedAi }, "AI suggest returned non-array response");
        res.status(500).json({ error: "AI processing failed" });
        return;
      }
      suggestions = parsedAi as Array<{ word: string; rationale: string }>;
    } catch (err) {
      logger.error({ err }, "AI suggest failed");
      res.status(500).json({ error: "AI processing failed" });
      return;
    }

    const response = SuggestWordsResponse.parse({ suggestions });
    res.json(response);
  } finally {
    aiRequestInFlight = false;
  }
});

export default router;

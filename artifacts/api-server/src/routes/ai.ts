import { Router, type IRouter } from "express";
import { eq, isNull, or } from "drizzle-orm";
import { db, wordsTable } from "@workspace/db";
import {
  AutofillWordsBody,
  AutofillWordsResponse,
  SuggestWordsBody,
  SuggestWordsResponse,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const VALID_REGIONS = ["All", "NE", "SE", "N Cent", "S Cent", "NW + AK", "SW + HI"];
const VALID_SURROUNDINGS = ["All", "Rural / Xurban", "Suburban / Town", "Urban / City", "Highway", "Coast"];
const VALID_DAY_NIGHT = ["Day", "Night"];
const VALID_AGES = ["Young", "Kid", "Tween"];
const VALID_FINDABILITIES = ["High", "Medium", "Low"];
const VALID_SEASONS = ["All", "Spring", "Summer", "Fall", "Winter"];
const VALID_BOARDS = [
  "General", "Flora & Fauna", "Chaos", "Christmas", "Halloween",
  "Sounds", "Smells", "Words for adults to say", "ABC Street Signs",
  "Architecture", "Single letter", "License plate", "Song lyrics",
  "Touchy feely", "Make your own", "Seasons"
];

const FIELD_DESCRIPTIONS = {
  regions: `Geographic regions in the US where this thing is commonly found. Valid values: ${VALID_REGIONS.join(", ")}. Use "All" if found everywhere, otherwise list the specific regions.`,
  surroundings: `What type of surroundings/environment this thing appears in. Valid values: ${VALID_SURROUNDINGS.join(", ")}. Can have multiple. Use "All" if ubiquitous.`,
  dayNight: `Whether this thing is visible day, night, or both. Valid values: ${VALID_DAY_NIGHT.join(", ")}. Default to ["Day"] for most things.`,
  age: `The age group most likely to find this interesting/challenging. Valid values: ${VALID_AGES.join(", ")} (single value only). Young=toddler/preschool simple objects, Kid=school-age, Tween=older kids/teens harder items.`,
  findability: `How easy or hard this thing is to find on a road trip. Valid values: ${VALID_FINDABILITIES.join(", ")} (single value only). High=very common, Medium=sometimes seen, Low=rare.`,
  seasons: `What seasons this thing is typically available/visible. Valid values: ${VALID_SEASONS.join(", ")}. Can have multiple.`,
  boards: `Which bingo board themes this word fits on. Valid values: ${VALID_BOARDS.join(", ")}. Can have multiple.`,
};

// POST /ai/autofill
router.post("/ai/autofill", async (req, res): Promise<void> => {
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
    wordsToFill = await db
      .select()
      .from(wordsTable)
      .where(
        wordIds.length === 1
          ? eq(wordsTable.id, wordIds[0])
          : or(...wordIds.map((id) => eq(wordsTable.id, id)))
      );
  } else {
    // Fill all incomplete words (missing age or findability)
    wordsToFill = await db
      .select()
      .from(wordsTable)
      .where(or(isNull(wordsTable.age), isNull(wordsTable.findability)));
    // Limit to 50 at a time
    wordsToFill = wordsToFill.slice(0, 50);
  }

  if (wordsToFill.length === 0) {
    const response = AutofillWordsResponse.parse({ updated: 0, results: [] });
    res.json(response);
    return;
  }

  // Build field descriptions for requested fields
  const fieldDescriptions = fields
    .map((f) => `- ${f}: ${FIELD_DESCRIPTIONS[f as keyof typeof FIELD_DESCRIPTIONS] ?? f}`)
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
      boards: w.boards,
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

  let aiResults: Array<{ id: number } & Record<string, unknown>>;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "[]";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    aiResults = JSON.parse(cleaned);
  } catch (err) {
    logger.error({ err }, "AI autofill failed");
    res.status(500).json({ error: "AI processing failed" });
    return;
  }

  // Apply updates
  const updatedWords = [];
  for (const result of aiResults) {
    const { id, ...updates } = result;
    if (!id) continue;

    const updateData: Partial<typeof wordsTable.$inferInsert> = {};

    if (fields.includes("regions") && updates.regions) {
      const val = updates.regions as string[];
      updateData.regions = val.filter((v) => VALID_REGIONS.includes(v));
    }
    if (fields.includes("surroundings") && updates.surroundings) {
      const val = updates.surroundings as string[];
      updateData.surroundings = val.filter((v) => VALID_SURROUNDINGS.includes(v));
    }
    if (fields.includes("dayNight") && updates.dayNight) {
      const val = updates.dayNight as string[];
      updateData.dayNight = val.filter((v) => VALID_DAY_NIGHT.includes(v));
    }
    if (fields.includes("age")) {
      const val = updates.age as string | null;
      if (val === null || VALID_AGES.includes(val)) {
        updateData.age = val;
      }
    }
    if (fields.includes("findability")) {
      const val = updates.findability as string | null;
      if (val === null || VALID_FINDABILITIES.includes(val)) {
        updateData.findability = val;
      }
    }
    if (fields.includes("seasons") && updates.seasons) {
      const val = updates.seasons as string[];
      updateData.seasons = val.filter((v) => VALID_SEASONS.includes(v));
    }
    if (fields.includes("boards") && updates.boards) {
      const val = updates.boards as string[];
      updateData.boards = val.filter((v) => VALID_BOARDS.includes(v));
    }

    if (Object.keys(updateData).length === 0) continue;

    const [updated] = await db
      .update(wordsTable)
      .set(updateData)
      .where(eq(wordsTable.id, id as number))
      .returning();

    if (updated) {
      updatedWords.push({
        id: updated.id,
        word: updated.word,
        regions: updated.regions ?? [],
        surroundings: updated.surroundings ?? [],
        dayNight: updated.dayNight ?? [],
        age: updated.age ?? null,
        findability: updated.findability ?? null,
        seasons: updated.seasons ?? [],
        boards: updated.boards ?? [],
        notes: updated.notes ?? null,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    }
  }

  const response = AutofillWordsResponse.parse({
    updated: updatedWords.length,
    results: updatedWords,
  });
  res.json(response);
});

// POST /ai/suggest
router.post("/ai/suggest", async (req, res): Promise<void> => {
  const parsed = SuggestWordsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

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
      model: "gpt-4o-mini",
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "[]";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    suggestions = JSON.parse(cleaned);
  } catch (err) {
    logger.error({ err }, "AI suggest failed");
    res.status(500).json({ error: "AI processing failed" });
    return;
  }

  const response = SuggestWordsResponse.parse({ suggestions });
  res.json(response);
});

export default router;

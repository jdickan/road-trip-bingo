import { createHash } from "node:crypto";
import { z } from "zod/v4";

const nullableText = z.string().nullable();
export const releaseWordSchema = z.object({
  id: z.number().int().positive(), word: z.string(),
  spanish: nullableText, emoji: nullableText, age: nullableText,
  findability: nullableText, seasons: z.array(z.string()),
  dayNight: z.array(z.string()), regions: z.array(z.string()),
  surroundings: z.array(z.string()),
});
export const releaseContentSchema = z.object({
  schemaVersion: z.literal(1),
  board: z.object({
    id: z.number().int().positive(), name: z.string().min(1),
    description: nullableText, ageLevels: z.array(z.string()),
    difficulty: nullableText, timeOfYear: nullableText,
    wordCount: z.number().int().nonnegative(),
  }),
  words: z.array(releaseWordSchema),
});
export type ReleaseContent = z.infer<typeof releaseContentSchema>;

/** Recursive lexicographic object keys; array order and JSON scalar encoding retained. */
export function canonicalReleaseJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalReleaseJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}:${canonicalReleaseJson(o[k])}`).join(",")}}`;
  }
  const json = JSON.stringify(value);
  if (json === undefined) throw new Error("Unsupported canonical JSON value.");
  return json;
}

export function releaseChecksum(content: ReleaseContent): string {
  return `sha256:${createHash("sha256").update(canonicalReleaseJson(content), "utf8").digest("hex")}`;
}

/** The minimum supports a 5x5 card; normalized duplicate labels are not distinct choices. */
export function validatePlayableRelease(content: ReleaseContent): void {
  const distinct = new Set(content.words.map(w => w.word.normalize("NFKC").trim().toLocaleLowerCase("en-US")));
  if (content.words.some(w => !w.word.trim()) || distinct.size < 25 ||
      content.board.wordCount !== content.words.length) {
    throw new Error("A release needs at least 25 distinct, non-empty playable words and an accurate word count.");
  }
}

import type { wordsTable } from "@workspace/db";

type WordRow = typeof wordsTable.$inferSelect;

export function missingAutofillFields(word: WordRow, fields: string[], boardIds: number[]): Set<string> {
  return new Set(fields.filter(field => {
    if (field === "boards") return boardIds.length === 0;
    const value = word[field as keyof WordRow];
    return value === null || value === undefined || (Array.isArray(value) && value.length === 0);
  }));
}

export function sameWordRevision(before: WordRow, current: WordRow): boolean {
  // Include content as well as timestamps (drivers truncate PG microseconds).
  return JSON.stringify(before) === JSON.stringify(current);
}
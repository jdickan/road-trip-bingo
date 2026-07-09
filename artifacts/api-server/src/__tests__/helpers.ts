import { sql } from "drizzle-orm";
import { db, boardsTable } from "@workspace/db";

export async function truncateAll(): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE bingo_word_boards, bingo_words, bingo_boards, bingo_todos RESTART IDENTITY CASCADE`,
  );
}

export async function seedBoards(
  names: string[],
): Promise<Map<string, number>> {
  const rows = await db
    .insert(boardsTable)
    .values(names.map((name) => ({ name, status: "active" })))
    .returning();
  return new Map(rows.map((r) => [r.name, r.id]));
}

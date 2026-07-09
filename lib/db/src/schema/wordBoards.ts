import { pgTable, integer, primaryKey, index } from "drizzle-orm/pg-core";
import { wordsTable } from "./words";
import { boardsTable } from "./boards";

export const wordBoardsTable = pgTable(
  "bingo_word_boards",
  {
    wordId: integer("word_id")
      .notNull()
      .references(() => wordsTable.id, { onDelete: "cascade" }),
    boardId: integer("board_id")
      .notNull()
      .references(() => boardsTable.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.wordId, t.boardId] }),
    index("idx_word_boards_board_id").on(t.boardId),
  ],
);

export type WordBoard = typeof wordBoardsTable.$inferSelect;

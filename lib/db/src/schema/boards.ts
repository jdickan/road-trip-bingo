import { pgTable, pgSequence, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Globally-monotonic content version sequence.
 *
 * Every "content changed" event on a published board draws the next value
 * from this single sequence and stamps it on the affected board's
 * contentVersion column. Because the sequence is global (not per-board),
 * `?since=<version>` delta queries are a simple `content_version > N`
 * comparison across all published boards.
 */
export const contentVersionSeq = pgSequence("bingo_content_version_seq");

export const boardsTable = pgTable("bingo_boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  ageLevels: text("age_levels").array().notNull().default([]),
  difficulty: text("difficulty"),
  timeOfYear: text("time_of_year"),
  availability: text("availability"),
  status: text("status").notNull().default("active"),
  published: boolean("published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  contentVersion: integer("content_version").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBoardSchema = createInsertSchema(boardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type Board = typeof boardsTable.$inferSelect;

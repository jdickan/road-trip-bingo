import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const wordsTable = pgTable("bingo_words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull(),
  regions: text("regions").array().notNull().default(["All"]),
  surroundings: text("surroundings").array().notNull().default([]),
  dayNight: text("day_night").array().notNull().default(["Day"]),
  age: text("age"),
  findability: text("findability"),
  seasons: text("seasons").array().notNull().default(["All"]),
  boards: text("boards").array().notNull().default([]),
  notes: text("notes"),
  spanish: text("spanish"),
  emoji: text("emoji"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWordSchema = createInsertSchema(wordsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof wordsTable.$inferSelect;

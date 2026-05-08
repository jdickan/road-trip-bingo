import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const todosTable = pgTable("bingo_todos", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("task"),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  severity: text("severity"),
  status: text("status").notNull().default("open"),
  wordSuggestion: text("word_suggestion"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTodoSchema = createInsertSchema(todosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTodo = z.infer<typeof insertTodoSchema>;
export type Todo = typeof todosTable.$inferSelect;

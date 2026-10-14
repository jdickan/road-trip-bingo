import { pgTable, serial, integer, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Deliberately no cascading FK to draft boards: approved history survives deletion.
// Payload is structured application content, not uploaded file bytes.
export const boardReleasesTable = pgTable("bingo_board_releases", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull(),
  version: integer("version").notNull().unique(),
  sourceReleaseId: integer("source_release_id"),
  payload: jsonb("payload").notNull(),
  checksum: text("checksum").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// All writers lock this singleton BEFORE reading/advancing the cursor.
// Allocation and commit ordering are serialized across server instances.
export const releaseCatalogTable = pgTable("bingo_release_catalog", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull().default(0),
});

// Append-only published-pointer history, including withdrawals/tombstones.
export const releaseEventsTable = pgTable("bingo_release_events", {
  version: integer("version").primaryKey(),
  boardId: integer("board_id").notNull(),
  releaseId: integer("release_id").notNull().references(() => boardReleasesTable.id),
  action: text("action").notNull(), // publish or withdraw
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBoardReleaseSchema = createInsertSchema(boardReleasesTable);
export const insertReleaseCatalogSchema = createInsertSchema(releaseCatalogTable);
export const insertReleaseEventSchema = createInsertSchema(releaseEventsTable);
export type BoardRelease = typeof boardReleasesTable.$inferSelect;

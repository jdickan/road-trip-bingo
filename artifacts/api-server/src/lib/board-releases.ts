import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, boardsTable, wordsTable, wordBoardsTable,
  boardReleasesTable, releaseCatalogTable, releaseEventsTable } from "@workspace/db";
import { releaseContentSchema, releaseChecksum, validatePlayableRelease } from "./release-content";

export class ReleaseError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function readDraftRelease(tx: Tx | typeof db, boardId: number) {
  const [board] = await tx.select().from(boardsTable).where(eq(boardsTable.id, boardId));
  if (!board) throw new ReleaseError("Board not found.", 404);
  const rows = await tx.select().from(wordsTable)
    .innerJoin(wordBoardsTable, eq(wordsTable.id, wordBoardsTable.wordId))
    .where(and(eq(wordBoardsTable.boardId, boardId), isNull(wordsTable.deletedAt)))
    .orderBy(wordsTable.id);
  return releaseContentSchema.parse({
    schemaVersion: 1,
    board: {
      id: board.id, name: board.name, description: board.description,
      ageLevels: board.ageLevels, difficulty: board.difficulty,
      timeOfYear: board.timeOfYear, wordCount: rows.length,
    },
    words: rows.map(({ bingo_words: w }) => ({
      id: w.id, word: w.word, spanish: w.spanish, emoji: w.emoji,
      age: w.age, findability: w.findability, seasons: w.seasons,
      dayNight: w.dayNight, regions: w.regions, surroundings: w.surroundings,
    })),
  });
}

export async function previewDraftRelease(boardId: number) {
  // One consistent snapshot of metadata AND words, even during concurrent edits.
  return db.transaction(async tx => {
    const content = await readDraftRelease(tx, boardId);
    let validationError: string | null = null;
    try { validatePlayableRelease(content); } catch (err) {
      validationError = (err as Error).message;
    }
    return { ...content, checksum: releaseChecksum(content), validationError };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

async function lockCatalog(tx: Tx) {
  await tx.insert(releaseCatalogTable).values({ id: 1, version: 0 }).onConflictDoNothing();
  const [state] = await tx.select().from(releaseCatalogTable)
    .where(eq(releaseCatalogTable.id, 1)).for("update");
  if (!state || state.version >= 2147483646) throw new ReleaseError("Release version budget exhausted.", 503);
  return state.version + 1;
}

/** No exposed update/delete path: rollback appends a new immutable release. */
export async function approveRelease(boardId: number, expectedChecksum: string, sourceReleaseId?: number) {
  return db.transaction(async tx => {
    const version = await lockCatalog(tx);
    let content;
    if (sourceReleaseId !== undefined) {
      const [source] = await tx.select().from(boardReleasesTable)
        .where(and(eq(boardReleasesTable.id, sourceReleaseId), eq(boardReleasesTable.boardId, boardId)));
      if (!source) throw new ReleaseError("Source release not found.", 404);
      content = releaseContentSchema.parse(source.payload);
    } else {
      content = await readDraftRelease(tx, boardId);
    }
    try { validatePlayableRelease(content); } catch (err) {
      throw new ReleaseError((err as Error).message);
    }
    const checksum = releaseChecksum(content);
    if (checksum !== expectedChecksum) {
      throw new ReleaseError("Draft changed since preview. Preview again before approving.", 409);
    }
    const [release] = await tx.insert(boardReleasesTable).values({
      boardId, version, sourceReleaseId: sourceReleaseId ?? null, payload: content, checksum,
    }).returning();
    await tx.insert(releaseEventsTable).values({ version, boardId, releaseId: release.id, action: "publish" });
    await tx.update(releaseCatalogTable).set({ version }).where(eq(releaseCatalogTable.id, 1));
    return release;
  }, { isolationLevel: "repeatable read" });
}

export async function withdrawRelease(boardId: number) {
  return db.transaction(async tx => {
    const version = await lockCatalog(tx);
    const [latest] = await tx.select().from(releaseEventsTable)
      .where(eq(releaseEventsTable.boardId, boardId)).orderBy(desc(releaseEventsTable.version)).limit(1);
    if (!latest || latest.action === "withdraw") return;
    await tx.insert(releaseEventsTable).values({
      version, boardId, releaseId: latest.releaseId, action: "withdraw",
    });
    await tx.update(releaseCatalogTable).set({ version }).where(eq(releaseCatalogTable.id, 1));
  }, { isolationLevel: "repeatable read" });
}

export function isSerializationConflict(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "40001" || e?.cause?.code === "40001";
}

// Imported sql intentionally avoided in callers; only parameterized Drizzle queries.
export { releaseContentSchema, releaseChecksum };

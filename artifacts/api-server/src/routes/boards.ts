import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, boardsTable, wordsTable } from "@workspace/db";

const router: IRouter = Router();

type BoardStatus = "active" | "draft" | "concept";

function mapBoard(row: typeof boardsTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    ageLevels: row.ageLevels ?? [],
    difficulty: row.difficulty ?? null,
    timeOfYear: row.timeOfYear ?? null,
    availability: row.availability ?? null,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseBoardId(id: string): number | null {
  const n = parseInt(id, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

function parseBodyFields(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const description = typeof body.description === "string" ? body.description : undefined;
  const ageLevels = Array.isArray(body.ageLevels)
    ? (body.ageLevels as unknown[]).filter((v) => typeof v === "string") as string[]
    : undefined;
  const difficulty = typeof body.difficulty === "string" ? body.difficulty : undefined;
  const timeOfYear = typeof body.timeOfYear === "string" ? body.timeOfYear : undefined;
  const availability = typeof body.availability === "string" ? body.availability : undefined;
  const statusRaw = typeof body.status === "string" ? body.status : undefined;
  const status: BoardStatus | undefined =
    statusRaw === "active" || statusRaw === "draft" || statusRaw === "concept"
      ? statusRaw
      : undefined;
  const notes = typeof body.notes === "string" ? body.notes : undefined;
  return { name, description, ageLevels, difficulty, timeOfYear, availability, status, notes };
}

// GET /boards
router.get("/boards", async (_req: Request, res: Response): Promise<void> => {
  const boards = await db.select().from(boardsTable).orderBy(boardsTable.name);

  // Count words per board name
  const allWords = await db.select({ boards: wordsTable.boards }).from(wordsTable);
  const wordCounts: Record<string, number> = {};
  for (const { boards } of allWords) {
    for (const b of boards ?? []) {
      wordCounts[b] = (wordCounts[b] ?? 0) + 1;
    }
  }

  res.json({
    boards: boards.map((b) => ({
      ...mapBoard(b),
      wordCount: wordCounts[b.name] ?? 0,
    })),
    total: boards.length,
  });
});

// GET /boards/:id
router.get("/boards/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseBoardId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid board id" });
    return;
  }

  const [board] = await db.select().from(boardsTable).where(eq(boardsTable.id, id));
  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }

  res.json(mapBoard(board));
});

// POST /boards
router.post("/boards", async (req: Request, res: Response): Promise<void> => {
  const body = parseBodyFields(req.body ?? {});
  if (!body.name) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [board] = await db
    .insert(boardsTable)
    .values({
      name: body.name,
      description: body.description ?? null,
      ageLevels: body.ageLevels ?? [],
      difficulty: body.difficulty ?? null,
      timeOfYear: body.timeOfYear ?? null,
      availability: body.availability ?? null,
      status: body.status ?? "active",
      notes: body.notes ?? null,
    })
    .returning();

  res.status(201).json(mapBoard(board));
});

// PATCH /boards/:id
router.patch("/boards/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseBoardId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid board id" });
    return;
  }

  const body = parseBodyFields(req.body ?? {});
  const updateData: Partial<typeof boardsTable.$inferInsert> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.ageLevels !== undefined) updateData.ageLevels = body.ageLevels;
  if (body.difficulty !== undefined) updateData.difficulty = body.difficulty;
  if (body.timeOfYear !== undefined) updateData.timeOfYear = body.timeOfYear;
  if (body.availability !== undefined) updateData.availability = body.availability;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const [board] = await db
    .update(boardsTable)
    .set(updateData)
    .where(eq(boardsTable.id, id))
    .returning();

  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }

  res.json(mapBoard(board));
});

// DELETE /boards/:id
router.delete("/boards/:id", async (req: Request, res: Response): Promise<void> => {
  const id = parseBoardId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid board id" });
    return;
  }

  const [board] = await db
    .delete(boardsTable)
    .where(eq(boardsTable.id, id))
    .returning();

  if (!board) {
    res.status(404).json({ error: "Board not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;

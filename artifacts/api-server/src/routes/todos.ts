import { Router } from "express";
import { db, todosTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const createTodoBody = z.object({
  type: z.enum(["bug", "word-idea", "feature", "task", "other"]).default("task"),
  title: z.string().min(1),
  description: z.string().nullish(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  severity: z.enum(["minor", "moderate", "major", "critical"]).nullish(),
  status: z.enum(["open", "in-progress", "done", "wontfix"]).default("open"),
  wordSuggestion: z.string().nullish(),
  notes: z.string().nullish(),
});

const patchTodoBody = createTodoBody.partial();

router.get("/todos", async (req, res) => {
  const todos = await db
    .select()
    .from(todosTable)
    .orderBy(todosTable.createdAt);
  res.json({ todos, total: todos.length });
});

router.post("/todos", async (req, res) => {
  const parsed = createTodoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const [todo] = await db
    .insert(todosTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(todo);
});

router.patch("/todos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = patchTodoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  const [todo] = await db
    .update(todosTable)
    .set(parsed.data)
    .where(eq(todosTable.id, id))
    .returning();
  if (!todo) { res.status(404).json({ error: "Not found" }); return; }
  res.json(todo);
});

router.delete("/todos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(todosTable).where(eq(todosTable.id, id));
  res.status(204).end();
});

export default router;

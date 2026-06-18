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
  try {
    const todos = await db
      .select()
      .from(todosTable)
      .orderBy(todosTable.createdAt);
    res.json({ todos, total: todos.length });
  } catch (err) {
    req.log.error({ err }, "GET /todos failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/todos", async (req, res) => {
  const parsed = createTodoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  try {
    const [todo] = await db
      .insert(todosTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(todo);
  } catch (err) {
    req.log.error({ err }, "POST /todos failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/todos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = patchTodoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", issues: parsed.error.issues });
    return;
  }
  try {
    const [todo] = await db
      .update(todosTable)
      .set(parsed.data)
      .where(eq(todosTable.id, id))
      .returning();
    if (!todo) { res.status(404).json({ error: "Not found" }); return; }
    res.json(todo);
  } catch (err) {
    req.log.error({ err }, "PATCH /todos/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/todos/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [deleted] = await db
      .delete(todosTable)
      .where(eq(todosTable.id, id))
      .returning({ id: todosTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "DELETE /todos/:id failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

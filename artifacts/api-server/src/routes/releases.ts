import { and, desc, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import {
  db, boardsTable, boardReleasesTable, releaseCatalogTable, releaseEventsTable,
  wordsTable, wordBoardsTable,
} from "@workspace/db";
import {
  approveRelease, isSerializationConflict, previewDraftRelease,
  readDraftRelease, ReleaseError, releaseChecksum, releaseContentSchema,
  withdrawRelease,
} from "../lib/board-releases";

const router: IRouter = Router();
const positiveInt = z.coerce.number().int().positive();

function apiError(err: unknown, req: Request, res: Response) {
  if (err instanceof ReleaseError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (isSerializationConflict(err)) {
    res.status(409).json({ error: "Concurrent release change. Retry after refreshing the preview." });
    return;
  }
  req.log.error({ err }, "Approved release request failed");
  res.status(500).json({ error: "Internal server error" });
}

// Editor-only preview; caller receives exact immutable payload + approval checksum.
router.get("/release/boards/:id/preview", async (req, res): Promise<void> => {
  const parsed = positiveInt.safeParse(req.params.id);
  if (!parsed.success) { res.status(400).json({ error: "Invalid board id." }); return; }
  try { res.json(await previewDraftRelease(parsed.data)); }
  catch (err) { apiError(err, req, res); }
});

router.get("/release/boards/:id/history", async (req, res): Promise<void> => {
  const parsed = positiveInt.safeParse(req.params.id);
  if (!parsed.success) { res.status(400).json({ error: "Invalid board id." }); return; }
  try {
    const releases = await db.select().from(boardReleasesTable)
      .where(eq(boardReleasesTable.boardId, parsed.data))
      .orderBy(desc(boardReleasesTable.version)).limit(50);
    const [current] = await db.select().from(releaseEventsTable)
      .where(eq(releaseEventsTable.boardId, parsed.data))
      .orderBy(desc(releaseEventsTable.version)).limit(1);
    res.json({ releases, currentVersion: current?.action === "publish" ? current.version : null });
  } catch (err) { apiError(err, req, res); }
});

const approvalBody = z.object({
  checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  sourceReleaseId: z.number().int().positive().optional(),
});
router.post("/release/boards/:id/publish", async (req, res): Promise<void> => {
  const id = positiveInt.safeParse(req.params.id);
  const body = approvalBody.safeParse(req.body);
  if (!id.success || !body.success) { res.status(400).json({ error: "Invalid board id or approval request." }); return; }
  try {
    const release = await approveRelease(id.data, body.data.checksum, body.data.sourceReleaseId);
    res.status(201).json(release);
  } catch (err) { apiError(err, req, res); }
});

router.post("/release/boards/:id/withdraw", async (req, res): Promise<void> => {
  const id = positiveInt.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid board id." }); return; }
  try {
    await withdrawRelease(id.data);
    res.status(204).end();
  } catch (err) { apiError(err, req, res); }
});

// Public v2 release API. v1 is intentionally left unchanged for existing clients.
router.get("/v2/boards", async (req: Request, res: Response): Promise<void> => {
  const sinceRaw = req.query["since"];
  const parsedSince = sinceRaw === undefined ? undefined : z.coerce.number().int().nonnegative().safeParse(sinceRaw);
  if (parsedSince && !parsedSince.success) { res.status(400).json({ error: "since must be a non-negative integer." }); return; }
  try {
    const result = await db.transaction(async tx => {
      const [state] = await tx.select().from(releaseCatalogTable).where(eq(releaseCatalogTable.id, 1));
      const latestVersion = state?.version ?? 0;
      const since = parsedSince?.success ? parsedSince.data : undefined;
      let events = await tx.selectDistinctOn([releaseEventsTable.boardId]).from(releaseEventsTable)
        .where(since !== undefined && since <= latestVersion
          ? and(lte(releaseEventsTable.version, latestVersion), gt(releaseEventsTable.version, since))
          : lte(releaseEventsTable.version, latestVersion))
        .orderBy(releaseEventsTable.boardId, desc(releaseEventsTable.version));
      if (since !== undefined && since <= latestVersion) {
        events = events.filter(e => e.action === "publish" || e.version > since);
      } else {
        events = events.filter(e => e.action === "publish");
      }
      return { boards: events.map(e => ({
        id: e.boardId, releaseId: e.releaseId, contentVersion: e.version,
      })), latestVersion };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
    res.json({ schemaVersion: 1, ...result, total: result.boards.length });
  } catch (err) { apiError(err, req, res); }
});

router.get("/v2/boards/:id/bundle", async (req: Request, res: Response): Promise<void> => {
  const id = positiveInt.safeParse(req.params.id);
  if (!id.success) { res.status(400).json({ error: "Invalid board id." }); return; }
  try {
    const [event] = await db.select().from(releaseEventsTable)
      .where(eq(releaseEventsTable.boardId, id.data))
      .orderBy(desc(releaseEventsTable.version)).limit(1);
    if (!event || event.action !== "publish") { res.status(404).json({ error: "Approved board not found." }); return; }
    const [release] = await db.select().from(boardReleasesTable)
      .where(eq(boardReleasesTable.id, event.releaseId));
    if (!release) { res.status(404).json({ error: "Approved board not found." }); return; }
    const content = releaseContentSchema.parse(release.payload);
    if (releaseChecksum(content) !== release.checksum) {
      res.status(500).json({ error: "Approved release integrity check failed." }); return;
    }
    res.json({ ...content, contentVersion: release.version, checksum: release.checksum });
  } catch (err) { apiError(err, req, res); }
});

router.get("/v2/boards/:id/releases/:version", async (req: Request, res: Response): Promise<void> => {
  const id = positiveInt.safeParse(req.params.id);
  const version = positiveInt.safeParse(req.params.version);
  if (!id.success || !version.success) { res.status(400).json({ error: "Invalid board or release version." }); return; }
  try {
    const [event] = await db.select().from(releaseEventsTable)
      .where(and(eq(releaseEventsTable.boardId, id.data), eq(releaseEventsTable.version, version.data)));
    if (!event || event.action !== "publish") { res.status(404).json({ error: "Approved release not found." }); return; }
    const [release] = await db.select().from(boardReleasesTable)
      .where(eq(boardReleasesTable.id, event.releaseId));
    if (!release) { res.status(404).json({ error: "Approved release not found." }); return; }
    const content = releaseContentSchema.parse(release.payload);
    if (releaseChecksum(content) !== release.checksum) {
      res.status(500).json({ error: "Approved release integrity check failed." }); return;
    }
    res.json({ ...content, contentVersion: release.version, checksum: release.checksum });
  } catch (err) { apiError(err, req, res); }
});

export default router;

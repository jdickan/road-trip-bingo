import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wordsRouter from "./words";
import aiRouter from "./ai";
import boardsRouter from "./boards";
import snapshotsRouter from "./snapshots";
import todosRouter from "./todos";
import v1Router from "./v1";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wordsRouter);
router.use(aiRouter);
router.use(boardsRouter);
router.use(snapshotsRouter);
router.use(todosRouter);
router.use(v1Router);

export default router;

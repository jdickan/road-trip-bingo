import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wordsRouter from "./words";
import aiRouter from "./ai";
import boardsRouter from "./boards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wordsRouter);
router.use(aiRouter);
router.use(boardsRouter);

export default router;

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import wordsRouter from "./words";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(wordsRouter);
router.use(aiRouter);

export default router;

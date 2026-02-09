import { Router, type IRouter } from "express";
import { analyzeRouter } from "./analyzeRoute.js";
import { downloadRouter } from "./downloadRoute.js";
import { versionRouter } from "./versionRoute.js";
import { adminRouter } from "./adminRoute.js";

export const apiRouter: IRouter = Router();

apiRouter.use("/analyze", analyzeRouter);
apiRouter.use("/download", downloadRouter);
apiRouter.use("/version", versionRouter);
apiRouter.use("/admin", adminRouter);

import { Router, type IRouter } from "express";
import { analyze, YtDlpError } from "../services/ytdlpService.js";
import { validateUrl } from "../services/urlValidator.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { analyzeLimiter } from "../middleware/rateLimiter.js";
import { logger } from "../utils/logger.js";
import type { AnalyzeRequest, AnalyzeResponse, ApiErrorResponse } from "../types/api.js";

export const analyzeRouter: IRouter = Router();

analyzeRouter.post(
  "/",
  analyzeLimiter,
  authMiddleware,
  async (req, res) => {
    const body = req.body as AnalyzeRequest;

    if (!body.url || typeof body.url !== "string") {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: { message: "URL is required", code: "VALIDATION_ERROR" },
      };
      res.status(400).json(errorResponse);
      return;
    }

    const validation = validateUrl(body.url);
    if (!validation.isValid) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: { message: validation.error, code: "VALIDATION_ERROR" },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      logger.info("Analyzing URL", { url: validation.sanitizedUrl, userId: req.user?.id });
      const videoInfo = await analyze(validation.sanitizedUrl);

      const response: AnalyzeResponse = {
        success: true,
        data: videoInfo,
      };
      res.json(response);
    } catch (err) {
      if (err instanceof YtDlpError) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: { message: err.message, code: "YTDLP_ERROR" },
        };
        const status = err.message.includes("timed out") ? 504 : 502;
        res.status(status).json(errorResponse);
        return;
      }
      throw err;
    }
  },
);

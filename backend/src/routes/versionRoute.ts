import { Router, type IRouter } from "express";
import { getVersion, YtDlpError } from "../services/ytdlpService.js";
import { versionLimiter } from "../middleware/rateLimiter.js";
import type { VersionResponse, ApiErrorResponse } from "../types/api.js";

export const versionRouter: IRouter = Router();

versionRouter.get("/", versionLimiter, async (_req, res) => {
  try {
    const version = await getVersion();
    const response: VersionResponse = {
      success: true,
      data: {
        version,
        lastUpdated: null,
      },
    };
    res.json(response);
  } catch (err) {
    if (err instanceof YtDlpError) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: { message: err.message, code: "YTDLP_ERROR" },
      };
      res.status(502).json(errorResponse);
      return;
    }
    throw err;
  }
});

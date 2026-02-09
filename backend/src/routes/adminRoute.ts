import { Router, type IRouter } from "express";
import { updateYtDlp, YtDlpError } from "../services/ytdlpService.js";
import { adminMiddleware } from "../middleware/adminMiddleware.js";
import { logger } from "../utils/logger.js";
import type { UpdateResponse, ApiErrorResponse } from "../types/api.js";

export const adminRouter: IRouter = Router();

adminRouter.post(
  "/update-ytdlp",
  adminMiddleware,
  async (_req, res) => {
    try {
      logger.info("Manual yt-dlp update triggered");
      const result = await updateYtDlp();

      const response: UpdateResponse = {
        success: true,
        data: result,
      };
      res.json(response);
    } catch (err) {
      if (err instanceof YtDlpError) {
        const errorResponse: ApiErrorResponse = {
          success: false,
          error: { message: err.message, code: "UPDATE_ERROR" },
        };
        res.status(502).json(errorResponse);
        return;
      }
      throw err;
    }
  },
);

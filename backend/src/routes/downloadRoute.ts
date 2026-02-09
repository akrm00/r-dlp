import { Router, type IRouter } from "express";
import { downloadStream, getFilename } from "../services/ytdlpService.js";
import { validateUrl } from "../services/urlValidator.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { downloadLimiter } from "../middleware/rateLimiter.js";
import { logger } from "../utils/logger.js";
import type { ApiErrorResponse } from "../types/api.js";

export const downloadRouter: IRouter = Router();

downloadRouter.get(
  "/",
  downloadLimiter,
  authMiddleware,
  async (req, res) => {
    const url = req.query.url;
    const formatId = req.query.format;

    if (typeof url !== "string" || !url) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: { message: "URL query parameter is required", code: "VALIDATION_ERROR" },
      };
      res.status(400).json(errorResponse);
      return;
    }

    if (typeof formatId !== "string" || !formatId) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: { message: "Format query parameter is required", code: "VALIDATION_ERROR" },
      };
      res.status(400).json(errorResponse);
      return;
    }

    const validation = validateUrl(url);
    if (!validation.isValid) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: { message: validation.error, code: "VALIDATION_ERROR" },
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Sanitize format ID: only allow alphanumeric, dash, plus
    if (!/^[\w+\-]+$/.test(formatId)) {
      const errorResponse: ApiErrorResponse = {
        success: false,
        error: { message: "Invalid format ID", code: "VALIDATION_ERROR" },
      };
      res.status(400).json(errorResponse);
      return;
    }

    try {
      logger.info("Starting download", {
        url: validation.sanitizedUrl,
        formatId,
        userId: req.user?.id,
      });

      const filename = await getFilename(validation.sanitizedUrl, formatId);
      const sanitizedFilename = filename.replace(/[^\w\s\-.()[\]]/g, "_");

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${sanitizedFilename}"`,
      );
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Transfer-Encoding", "chunked");

      const handle = downloadStream(validation.sanitizedUrl, formatId);

      req.on("close", () => {
        logger.info("Client disconnected, killing yt-dlp process", { url, formatId });
        handle.kill();
      });

      handle.stream.on("error", (err) => {
        logger.error("Download stream error", err, { url, formatId });
        if (!res.headersSent) {
          res.status(502).json({
            success: false,
            error: { message: "Download stream failed", code: "DOWNLOAD_ERROR" },
          });
        }
        handle.kill();
      });

      handle.process.on("close", (code) => {
        if (code !== 0 && code !== null && !res.writableEnded) {
          logger.warn("yt-dlp download exited with non-zero code", { code, url, formatId });
        }
      });

      handle.stream.pipe(res);
    } catch (err) {
      logger.error("Download failed", err, { url, formatId });
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: { message: "Failed to start download", code: "DOWNLOAD_ERROR" },
        });
      }
    }
  },
);

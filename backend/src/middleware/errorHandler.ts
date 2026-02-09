import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";
import { YtDlpError } from "../services/ytdlpService.js";
import type { ApiErrorResponse } from "../types/api.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof YtDlpError) {
    const status = err.exitCode === null ? 504 : 502;
    const response: ApiErrorResponse = {
      success: false,
      error: {
        message: err.message,
        code: "YTDLP_ERROR",
      },
    };
    res.status(status).json(response);
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        message: "Invalid JSON in request body",
        code: "INVALID_JSON",
      },
    };
    res.status(400).json(response);
    return;
  }

  logger.error("Unhandled error", err);

  const response: ApiErrorResponse = {
    success: false,
    error: {
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    },
  };
  res.status(500).json(response);
}

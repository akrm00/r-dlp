import type { Request, Response, NextFunction } from "express";

export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (!adminApiKey) {
    res.status(500).json({
      success: false,
      error: { message: "Admin API key not configured", code: "CONFIG_ERROR" },
    });
    return;
  }

  const providedKey = req.headers["x-admin-key"];

  if (typeof providedKey !== "string" || providedKey !== adminApiKey) {
    res.status(403).json({
      success: false,
      error: { message: "Forbidden", code: "FORBIDDEN" },
    });
    return;
  }

  next();
}

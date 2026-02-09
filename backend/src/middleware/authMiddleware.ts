import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";

type JwtPayload = {
  sub: string;
  email?: string;
  role?: string;
  exp?: number;
};

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      error: { message: "Authentication required", code: "UNAUTHORIZED" },
    });
    return;
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    logger.error("SUPABASE_JWT_SECRET is not configured");
    res.status(500).json({
      success: false,
      error: { message: "Server authentication misconfigured", code: "CONFIG_ERROR" },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    req.user = {
      id: decoded.sub,
      email: decoded.email ?? "",
      role: decoded.role ?? "authenticated",
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: { message: "Token expired. Please sign in again.", code: "TOKEN_EXPIRED" },
      });
      return;
    }

    logger.warn("JWT verification failed", { error: (err as Error).message });
    res.status(401).json({
      success: false,
      error: { message: "Invalid authentication token", code: "INVALID_TOKEN" },
    });
  }
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const queryToken = req.query.token;
  if (typeof queryToken === "string" && queryToken.length > 0) {
    return queryToken;
  }

  return null;
}

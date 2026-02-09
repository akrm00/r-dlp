import rateLimit from "express-rate-limit";

export const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Too many analysis requests. Please wait a moment.",
      code: "RATE_LIMIT",
    },
  },
});

export const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Too many download requests. Please wait a moment.",
      code: "RATE_LIMIT",
    },
  },
});

export const versionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

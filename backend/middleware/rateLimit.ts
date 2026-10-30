import rateLimit from "express-rate-limit";

// Per-IP limits, in memory (single API process). TODO: swap the store for Redis before running multiple replicas.
export const authLimiter = (max = Number(process.env.AUTH_RATE_LIMIT_MAX || 20), windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
      const retryAfter = Math.ceil((req.rateLimit?.resetTime ? req.rateLimit.resetTime.getTime() - Date.now() : windowMs) / 1000);
      res.status(options.statusCode).json({ code: "RATE_LIMITED", message: "Too many requests, please try again later", retryAfter });
    },
  });

// Per-actor limits for write actions (keyed by user id, falling back to IP). In-memory, single process.
const ACTION_LIMITS: Record<"bid" | "comment" | "upload", { max: number; windowMs: number }> = {
  bid: { max: Number(process.env.BID_RATE_LIMIT_MAX || 30), windowMs: 60 * 1000 },
  comment: { max: Number(process.env.COMMENT_RATE_LIMIT_MAX || 10), windowMs: 60 * 1000 },
  upload: { max: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 10), windowMs: 10 * 60 * 1000 },
};

export const actionLimiter = (kind: keyof typeof ACTION_LIMITS) =>
  rateLimit({
    windowMs: ACTION_LIMITS[kind].windowMs,
    limit: ACTION_LIMITS[kind].max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => (req.user ? `u${req.user.id}` : (req.ip ?? "unknown")),
    handler: (req, res, _next, options) => {
      res.status(options.statusCode).json({ code: "RATE_LIMITED", message: "Too many requests, please slow down", retryAfter: Math.ceil(((req.rateLimit?.resetTime?.getTime() ?? Date.now() + ACTION_LIMITS[kind].windowMs) - Date.now()) / 1000) });
    },
  });

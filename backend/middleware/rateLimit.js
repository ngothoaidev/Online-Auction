import rateLimit from "express-rate-limit";

// Per-IP limits, in memory (single API process). ponytail: swap the store for Redis before running multiple replicas.
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

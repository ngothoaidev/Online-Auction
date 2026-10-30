import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors.ts";
import log from "../utils/log.ts";
import { report } from "../utils/sentry.ts";

// Single error envelope: { code, message, requestId, details? }. Unexpected errors never leak internals.
// Anything can be thrown; non-AppErrors may still carry an HTTP status (body-parser, multer, ...).
type Thrown = Partial<AppError> & { statusCode?: number };

const errorHandler = (thrown: unknown, req: Request, res: Response, _next: NextFunction) => {
  const err = (thrown ?? {}) as Thrown;
  const known = thrown instanceof AppError;
  const status: number = known ? thrown.status : (err.status && err.status < 600 ? err.status : ((err.statusCode ?? 0) >= 400 ? err.statusCode! : 500));
  if (status >= 500) {
    log.error("unhandled error", { requestId: req.id, method: req.method, path: req.originalUrl.split("?")[0], error: thrown });
    report(thrown, { requestId: req.id, route: req.route?.path });
  }
  const expose = known || status < 500;
  res.status(status).json({
    code: known ? thrown.code : status === 404 ? "NOT_FOUND" : status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST",
    message: expose ? err.message : "An unexpected error occurred",
    requestId: req.id,
    ...(known && thrown.details !== undefined ? { details: thrown.details } : {}),
  });
};

export default errorHandler;

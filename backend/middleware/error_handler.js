import { AppError } from "../utils/errors.js";
import log from "../utils/log.js";

// Single error envelope: { code, message, requestId, details? }. Unexpected errors never leak internals.
const errorHandler = (err, req, res, _next) => {
  const known = err instanceof AppError;
  const status = known ? err.status : (err.status && err.status < 600 ? err.status : (err.statusCode >= 400 ? err.statusCode : 500));
  if (status >= 500) log.error("unhandled error", { requestId: req.id, method: req.method, path: req.originalUrl.split("?")[0], error: err });
  const expose = known || status < 500;
  res.status(status).json({
    code: known ? err.code : status === 404 ? "NOT_FOUND" : status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST",
    message: expose ? err.message : "An unexpected error occurred",
    requestId: req.id,
    ...(known && err.details !== undefined ? { details: err.details } : {}),
  });
};

export default errorHandler;

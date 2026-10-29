import { z } from "zod";
import { AppError } from "../utils/errors.js";

/** Express middleware: parse + replace req.params/query/body with the validated (and stripped/coerced) values. */
export const validate = ({ params, query, body } = {}) => (req, _res, next) => {
  try {
    if (params) req.params = params.parse(req.params);
    if (query) req.query = query.parse(req.query);
    if (body) req.body = body.parse(req.body ?? {});
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(400, "VALIDATION_ERROR", "Invalid request", error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))));
    }
    next(error);
  }
};

export const idParam = z.object({ id: z.coerce.number().int().positive() }).passthrough();
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).passthrough();

/** multipart/form-data booleans arrive as strings; only the literals 'true'/'false' are accepted ('false' is NOT truthy). */
export const formBoolean = z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")]);
/** Money input accepted at the API edge: positive integer, up to 15 digits (B01), as number or digit string. */
export const moneyInput = z.union([z.number(), z.string()]).transform((v, ctx) => {
  const s = String(v).trim();
  if (!/^[1-9]\d{0,14}$/.test(s)) {
    ctx.addIssue({ code: "custom", message: "Must be a positive whole amount of at most 15 digits" });
    return z.NEVER;
  }
  return s;
});

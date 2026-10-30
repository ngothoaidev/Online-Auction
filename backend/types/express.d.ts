// req.user is the full users row the auth middleware loads (passport declares the property, we give it a shape).
import type { RateLimitInfo } from "express-rate-limit";
import type { OrderRow, UserRow } from "../db/index.ts";

declare global {
  namespace Express {
    // Declaration merging into passport's empty Express.User: no members of its own on purpose.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserRow {}
    interface Request {
      /** Set by middleware/request_id for every request. */
      id: string;
      /** Set by express-rate-limit on limited routes. */
      rateLimit?: RateLimitInfo;
      /** Set by the proof-upload gate in routes/order once the caller is authorised for this order. */
      order?: OrderRow;
    }
  }
}

export {};

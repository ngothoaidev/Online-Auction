// Reviews: one per (auction, reviewer), only for the counterpart, only once the buyer has confirmed receipt.
// Review row, rating counters and the pending_review -> completed transition commit together under the lock order
// auction -> order -> target user.
import { and, eq, sql } from "drizzle-orm";
import db from "../db/index.js";
import { auctions, orders, reviews, users } from "../db/schema.js";
import { AppError } from "../utils/errors.js";
import { runIdempotent } from "./idempotency.js";
import { applyTransition } from "./orderCommands.js";

const REVIEWABLE = new Set(["pending_review", "completed"]);

export async function submitReview({ orderId, actor, isGoodRating, comment, key }) {
  if (typeof isGoodRating !== "boolean") throw new AppError(400, "VALIDATION_ERROR", "isGoodRating must be true or false");
  const text = typeof comment === "string" ? comment.trim().slice(0, 1000) : null;

  return db.transaction((tx) => runIdempotent(tx, { actorId: actor.id, operation: `review:${orderId}`, key, payload: { isGoodRating, comment: text } }, async () => {
    const [head] = await tx.select({ auctionId: orders.auctionId }).from(orders).where(eq(orders.id, orderId));
    if (!head) throw new AppError(404, "NOT_FOUND", "Order not found");
    await tx.select({ id: auctions.id }).from(auctions).where(eq(auctions.id, head.auctionId)).for("update"); // 1) auction
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");                 // 2) order

    const isBuyer = order.buyerId === actor.id;
    const isSeller = order.sellerId === actor.id;
    if (!isBuyer && !isSeller) throw new AppError(403, "FORBIDDEN", "Access denied");
    if (!REVIEWABLE.has(order.status)) {
      throw new AppError(409, "REVIEW_NOT_ALLOWED", "Reviews open after the buyer has confirmed receipt");
    }
    const targetId = isBuyer ? order.sellerId : order.buyerId; // never client-chosen

    // 3) target user. NO KEY UPDATE, not UPDATE: the reviews insert takes FK KEY SHARE locks on both parties, so a
    // FOR UPDATE here deadlocks with the counterpart reviewing another order between the same two users.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, targetId)).for("no key update");

    const [existing] = await tx.select().from(reviews).where(and(eq(reviews.auctionId, order.auctionId), eq(reviews.reviewerId, actor.id)));
    let review;
    let isNew = false;
    if (existing) {
      [review] = await tx.update(reviews).set({ isGoodRating, comment: text }).where(eq(reviews.id, existing.id)).returning();
      const dPos = Number(isGoodRating) - Number(Boolean(existing.isGoodRating));
      if (dPos !== 0) await tx.update(users).set({ positiveRatingCount: sql`${users.positiveRatingCount} + ${dPos}` }).where(eq(users.id, targetId));
    } else {
      isNew = true;
      [review] = await tx.insert(reviews).values({ reviewerId: actor.id, targetId, auctionId: order.auctionId, isGoodRating, comment: text, createdAt: new Date() }).returning();
      await tx.update(users).set({
        ratingCount: sql`${users.ratingCount} + 1`,
        positiveRatingCount: sql`${users.positiveRatingCount} + ${Number(isGoodRating)}`,
      }).where(eq(users.id, targetId));
    }

    // both parties reviewed -> completed (once; a completed order just keeps accepting edits)
    let completed = order.status === "completed";
    if (order.status === "pending_review") {
      const [{ n }] = await tx.select({ n: sql`count(DISTINCT ${reviews.reviewerId})::int` }).from(reviews).where(eq(reviews.auctionId, order.auctionId));
      if (n >= 2) {
        await applyTransition(tx, { orderId, command: "complete", actor: { type: "system" } });
        completed = true;
      }
    }
    return { status: 200, resourceId: String(review.id), body: { message: isNew ? "Review submitted" : "Review updated", review, orderCompleted: completed } };
  }));
}

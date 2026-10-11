import db from "../db/index.js";
import { orders, orderMessages, users, auctions, reviews } from "../db/schema.js";
import { eq, and, or, ne, desc } from "drizzle-orm";
import { attachAsset } from "./media.js";

const service = {
    // Get order by ID
    getById: async function(orderId) {
        const result = await db.select().from(orders).where(eq(orders.id, orderId));
        return result.length > 0 ? result[0] : null;
    },

    // Get order by auction ID
    getByAuctionId: async function(auctionId) {
        const result = await db.select().from(orders).where(eq(orders.auctionId, auctionId));
        return result.length > 0 ? result[0] : null;
    },

    // Get orders for a user (as buyer or seller)
    getByUserId: async function(userId) {
        return db.select()
            .from(orders)
            .where(or(eq(orders.buyerId, userId), eq(orders.sellerId, userId)))
            .orderBy(desc(orders.createdAt));
    },

    // Get order with full details (auction, buyer, seller info)
    getOrderWithDetails: async function(orderId) {
        const result = await db.select({
            order: orders,
            auction: auctions,
            buyer: {
                id: users.id,
                username: users.username,
                email: users.email,
                fullName: users.fullName,
                avatarUrl: users.avatarUrl,
                ratingCount: users.ratingCount,
                positiveRatingCount: users.positiveRatingCount,
            },
        })
        .from(orders)
        .innerJoin(auctions, eq(orders.auctionId, auctions.id))
        .innerJoin(users, eq(orders.buyerId, users.id))
        .where(eq(orders.id, orderId));

        if (result.length === 0) return null;

        // Get seller info separately
        const sellerResult = await db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            fullName: users.fullName,
            avatarUrl: users.avatarUrl,
            ratingCount: users.ratingCount,
            positiveRatingCount: users.positiveRatingCount,
        })
        .from(users)
        .where(eq(users.id, result[0].order.sellerId));

        return {
            ...result[0],
            seller: sellerResult[0],
        };
    },

    // All order state changes live in services/orderCommands.js (state machine, locking, audit).

    // ============ MESSAGES ============

    // Send message (an optional image must be a pending upload of the sender, attached in the same transaction)
    sendMessage: async function(orderId, senderId, message, imageAssetId = null) {
        return db.transaction(async (tx) => {
            const imageUrl = imageAssetId ? await attachAsset(tx, { assetId: imageAssetId, orderId, ownerId: senderId, purpose: 'message' }) : null;
            const result = await tx.insert(orderMessages).values({
                orderId, senderId, message, imageUrl, isRead: false, createdAt: new Date(),
            }).returning();
            return result[0];
        });
    },

    // Get messages for an order
    getMessages: async function(orderId) {
        return db.select({
            message: orderMessages,
            sender: {
                id: users.id,
                username: users.username,
                avatarUrl: users.avatarUrl,
            }
        })
        .from(orderMessages)
        .innerJoin(users, eq(orderMessages.senderId, users.id))
        .where(eq(orderMessages.orderId, orderId))
        .orderBy(orderMessages.createdAt);
    },

    // Mark the OTHER party's messages as read for this reader
    markMessagesAsRead: async function(orderId, readerId) {
        await db.update(orderMessages)
            .set({ isRead: true })
            .where(and(
                eq(orderMessages.orderId, orderId),
                ne(orderMessages.senderId, readerId),
                eq(orderMessages.isRead, false)
            ));
    },

    // Unread messages sent by the other party
    getUnreadCount: async function(orderId, userId) {
        const result = await db.select().from(orderMessages)
            .where(and(eq(orderMessages.orderId, orderId), eq(orderMessages.isRead, false), ne(orderMessages.senderId, userId)));
        return result.length;
    },

    // ============ REVIEWS ============

    // Get reviews for an order
    getOrderReviews: async function(auctionId) {
        return db.select({
            review: reviews,
            reviewer: {
                id: users.id,
                username: users.username,
                avatarUrl: users.avatarUrl,
            }
        })
        .from(reviews)
        .innerJoin(users, eq(reviews.reviewerId, users.id))
        .where(eq(reviews.auctionId, auctionId));
    },

    // Check if user has reviewed
    hasUserReviewed: async function(auctionId, reviewerId) {
        const result = await db.select()
            .from(reviews)
            .where(and(
                eq(reviews.auctionId, auctionId),
                eq(reviews.reviewerId, reviewerId)
            ));
        return result.length > 0;
    },

    // Create or update review
    submitReview: async function(reviewerId, targetId, auctionId, isGoodRating, comment) {
        // Check if review exists
        const existing = await db.select()
            .from(reviews)
            .where(and(
                eq(reviews.auctionId, auctionId),
                eq(reviews.reviewerId, reviewerId)
            ));

        if (existing.length > 0) {
            // Update existing review
            const result = await db.update(reviews)
                .set({
                    isGoodRating,
                    comment,
                })
                .where(eq(reviews.id, existing[0].id))
                .returning();
            return { review: result[0], isNew: false };
        } else {
            // Create new review
            const result = await db.insert(reviews).values({
                reviewerId,
                targetId,
                auctionId,
                isGoodRating,
                comment,
                createdAt: new Date(),
            }).returning();

            // Update target user's rating count
            const targetUser = await db.select().from(users).where(eq(users.id, targetId));
            if (targetUser.length > 0) {
                await db.update(users)
                    .set({
                        ratingCount: (targetUser[0].ratingCount || 0) + 1,
                        positiveRatingCount: isGoodRating 
                            ? (targetUser[0].positiveRatingCount || 0) + 1 
                            : targetUser[0].positiveRatingCount || 0,
                    })
                    .where(eq(users.id, targetId));
            }

            return { review: result[0], isNew: true };
        }
    },

    // Update review (change rating)
    updateReview: async function(reviewId, isGoodRating, comment) {
        // Get old review first
        const oldReview = await db.select().from(reviews).where(eq(reviews.id, reviewId));
        if (oldReview.length === 0) return null;

        const wasPositive = oldReview[0].isGoodRating;
        
        // Update review
        const result = await db.update(reviews)
            .set({ isGoodRating, comment })
            .where(eq(reviews.id, reviewId))
            .returning();

        // Update user rating if changed
        if (wasPositive !== isGoodRating) {
            const targetUser = await db.select().from(users).where(eq(users.id, oldReview[0].targetId));
            if (targetUser.length > 0) {
                await db.update(users)
                    .set({
                        positiveRatingCount: isGoodRating 
                            ? (targetUser[0].positiveRatingCount || 0) + 1 
                            : Math.max(0, (targetUser[0].positiveRatingCount || 0) - 1),
                    })
                    .where(eq(users.id, oldReview[0].targetId));
            }
        }

        return result[0];
    },
};

export default service;

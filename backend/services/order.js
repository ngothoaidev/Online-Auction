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

};

export default service;

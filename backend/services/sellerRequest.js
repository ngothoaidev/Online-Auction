import db from "../db/index.js";
import { sellerRequests, users, bids, reviews } from "../db/schema.js";
import { eq, desc, sql, and, count } from "drizzle-orm";

const service = {
    // Create a new seller request
    create: async function(userId, reason) {
        const result = await db.insert(sellerRequests).values({
            userId,
            reason,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        return result[0];
    },

    // Get all seller requests with user info
    findAll: async function(status = null) {
        let query = db
            .select({
                id: sellerRequests.id,
                userId: sellerRequests.userId,
                reason: sellerRequests.reason,
                status: sellerRequests.status,
                adminNote: sellerRequests.adminNote,
                createdAt: sellerRequests.createdAt,
                updatedAt: sellerRequests.updatedAt,
                user: {
                    id: users.id,
                    username: users.username,
                    email: users.email,
                    fullName: users.fullName,
                    avatarUrl: users.avatarUrl,
                    createdAt: users.createdAt,
                    ratingCount: users.ratingCount,
                    positiveRatingCount: users.positiveRatingCount,
                }
            })
            .from(sellerRequests)
            .leftJoin(users, eq(sellerRequests.userId, users.id))
            .orderBy(desc(sellerRequests.createdAt));

        if (status) {
            query = query.where(eq(sellerRequests.status, status));
        }

        return query;
    },

    // Get a specific request by ID
    getById: async function(id) {
        const result = await db
            .select({
                id: sellerRequests.id,
                userId: sellerRequests.userId,
                reason: sellerRequests.reason,
                status: sellerRequests.status,
                adminNote: sellerRequests.adminNote,
                createdAt: sellerRequests.createdAt,
                updatedAt: sellerRequests.updatedAt,
                user: {
                    id: users.id,
                    username: users.username,
                    email: users.email,
                    fullName: users.fullName,
                    avatarUrl: users.avatarUrl,
                    createdAt: users.createdAt,
                    ratingCount: users.ratingCount,
                    positiveRatingCount: users.positiveRatingCount,
                }
            })
            .from(sellerRequests)
            .leftJoin(users, eq(sellerRequests.userId, users.id))
            .where(eq(sellerRequests.id, id));
        
        return result.length > 0 ? result[0] : null;
    },

    // Get request by user ID
    getByUserId: async function(userId) {
        const result = await db
            .select()
            .from(sellerRequests)
            .where(eq(sellerRequests.userId, userId))
            .orderBy(desc(sellerRequests.createdAt));
        
        return result.length > 0 ? result[0] : null;
    },

    // Check if user has a pending request
    hasPendingRequest: async function(userId) {
        const result = await db
            .select()
            .from(sellerRequests)
            .where(
                and(
                    eq(sellerRequests.userId, userId),
                    eq(sellerRequests.status, 'pending')
                )
            );
        
        return result.length > 0;
    },

    // Check if user can reapply (7 days after rejection)
    canReapplyAfterRejection: async function(userId) {
        const result = await db
            .select()
            .from(sellerRequests)
            .where(
                and(
                    eq(sellerRequests.userId, userId),
                    eq(sellerRequests.status, 'rejected')
                )
            )
            .orderBy(desc(sellerRequests.updatedAt))
            .limit(1);
        
        if (result.length === 0) {
            return { canReapply: true };
        }

        const lastRejection = result[0];
        const rejectionDate = new Date(lastRejection.updatedAt);
        const sevenDaysLater = new Date(rejectionDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const now = new Date();

        if (now >= sevenDaysLater) {
            return { canReapply: true };
        }

        return {
            canReapply: false,
            canReapplyDate: sevenDaysLater,
            daysRemaining: Math.ceil((sevenDaysLater - now) / (24 * 60 * 60 * 1000))
        };
    },

    // Check if user has an active seller status (approved and not expired)
    getActiveSellerStatus: async function(userId) {
        const result = await db
            .select()
            .from(sellerRequests)
            .where(
                and(
                    eq(sellerRequests.userId, userId),
                    eq(sellerRequests.status, 'approved')
                )
            )
            .orderBy(desc(sellerRequests.updatedAt))
            .limit(1);
        
        if (result.length === 0) {
            return null;
        }

        const approvedRequest = result[0];
        if (approvedRequest.sellerExpiryDate) {
            const expiryDate = new Date(approvedRequest.sellerExpiryDate);
            const now = new Date();
            
            if (now < expiryDate) {
                // Still active seller
                return {
                    isActive: true,
                    expiryDate: expiryDate,
                    daysRemaining: Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000))
                };
            } else {
                // Seller status expired
                return {
                    isActive: false,
                    expired: true,
                    expiryDate: expiryDate
                };
            }
        }

        return null;
    },

    // Update request status (approve/reject)
    updateStatus: async function(id, status, adminNote = null, userId = null) {
        const updateData = {
            status,
            updatedAt: new Date(),
        };
        
        if (adminNote !== null) {
            updateData.adminNote = adminNote;
        }

        // Set seller expiry date to 7 days from now when approved
        if (status === 'approved') {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7);
            updateData.sellerExpiryDate = expiryDate;
            
            // Immediately change user role to seller
            if (userId) {
                await db.update(users).set({ role: 'seller' }).where(eq(users.id, userId));
            }
        }

        const result = await db
            .update(sellerRequests)
            .set(updateData)
            .where(eq(sellerRequests.id, id))
            .returning();
        
        return result[0];
    },

    // Get user statistics for admin review
    getUserStats: async function(userId) {
        // Get total bids count
        const bidsCount = await db
            .select({ count: count() })
            .from(bids)
            .where(eq(bids.bidderId, userId));

        // Get won auctions count (where user is winner)
        const wonCount = await db
            .select({ count: count() })
            .from(bids)
            .innerJoin(
                db.select().from(bids).as('max_bids'),
                sql`${bids.auctionId} = max_bids.auction_id`
            )
            .where(eq(bids.bidderId, userId));

        return {
            totalBids: bidsCount[0]?.count || 0,
        };
    },

    // Delete a request
    delete: async function(id) {
        return db.delete(sellerRequests).where(eq(sellerRequests.id, id));
    },

    // Check seller status - if expired, revert to buyer
    checkAndUpdateSellerStatus: async function(userId) {
        const result = await db
            .select()
            .from(sellerRequests)
            .where(
                and(
                    eq(sellerRequests.userId, userId),
                    eq(sellerRequests.status, 'approved')
                )
            )
            .orderBy(desc(sellerRequests.updatedAt))
            .limit(1);
        
        if (result.length === 0) {
            return { status: 'no_request' };
        }

        const approvedRequest = result[0];
        if (approvedRequest.sellerExpiryDate) {
            const expiryDate = new Date(approvedRequest.sellerExpiryDate);
            const now = new Date();
            
            if (now >= expiryDate) {
                // Seller status expired - revert to buyer
                await db.update(users).set({ role: 'buyer' }).where(eq(users.id, userId));
                return { 
                    status: 'expired', 
                    expiredAt: expiryDate,
                    reverted: true 
                };
            } else {
                // Still active seller
                return {
                    status: 'active',
                    expiryDate: expiryDate,
                    daysRemaining: Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000))
                };
            }
        }

        return { status: 'no_expiry' };
    }
};

export default service;

import db from "../db/index.ts";
import { sellerRequests, sellerRequestStatusEnum, users } from "../db/schema.ts";
import { eq, desc, and } from "drizzle-orm";

type RequestStatus = (typeof sellerRequestStatusEnum.enumValues)[number];
const DAY_MS = 24 * 60 * 60 * 1000;

const service = {
    // Create a new seller request
    create: async function(userId: number, reason: string) {
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
    findAll: async function(status: RequestStatus | null = null) {
        return db
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
            .where(status ? eq(sellerRequests.status, status) : undefined)
            .orderBy(desc(sellerRequests.createdAt));
    },


    // Get request by user ID
    getByUserId: async function(userId: number) {
        const result = await db
            .select()
            .from(sellerRequests)
            .where(eq(sellerRequests.userId, userId))
            .orderBy(desc(sellerRequests.createdAt));
        
        return result.length > 0 ? result[0] : null;
    },

    // Check if user has a pending request
    hasPendingRequest: async function(userId: number) {
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
    canReapplyAfterRejection: async function(userId: number): Promise<{ canReapply: true } | { canReapply: false; canReapplyDate: Date; daysRemaining: number }> {
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
        const rejectionDate = new Date(lastRejection.updatedAt ?? 0);
        const sevenDaysLater = new Date(rejectionDate.getTime() + 7 * DAY_MS);
        const now = new Date();

        if (now >= sevenDaysLater) {
            return { canReapply: true };
        }

        return {
            canReapply: false,
            canReapplyDate: sevenDaysLater,
            daysRemaining: Math.ceil((sevenDaysLater.getTime() - now.getTime()) / DAY_MS)
        };
    },

    // Check if user has an active seller status (approved and not expired)
    getActiveSellerStatus: async function(userId: number) {
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
                    daysRemaining: Math.ceil((expiryDate.getTime() - now.getTime()) / DAY_MS)
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


    // Check seller status - if expired, revert to buyer
    checkAndUpdateSellerStatus: async function(userId: number) {
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
                    daysRemaining: Math.ceil((expiryDate.getTime() - now.getTime()) / DAY_MS)
                };
            }
        }

        return { status: 'no_expiry' };
    }
};

export default service;

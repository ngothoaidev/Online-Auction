import db from "../db/index.ts"

import { users, bids, auctions, userFavorites, categories, reviews, userRoleEnum, userStatusEnum } from "../db/schema.ts"
import type { SQL } from "drizzle-orm";

import { eq, or, ilike, and, sql, count, desc } from "drizzle-orm";
import { wonBy } from "./auction.ts";

import dotenv from 'dotenv'

dotenv.config();

type Role = (typeof userRoleEnum.enumValues)[number];
type Status = (typeof userStatusEnum.enumValues)[number];

const service = {
    findAll: async function(){
        return db.select().from(users);
    },

    // Get users with pagination, filtering, and search
    findAllPaginated: async function({ page = 1, limit = 10, search = '', role = '', status = '' }: { page?: number; limit?: number; search?: string; role?: string; status?: string }) {
        const offset = (page - 1) * limit;
        
        // Build where conditions
        const conditions: (SQL | undefined)[] = [];
        
        if (search) {
            conditions.push(
                or(
                    ilike(users.username, `%${search}%`),
                    ilike(users.email, `%${search}%`),
                    ilike(users.fullName, `%${search}%`)
                )
            );
        }
        
        if (role && role !== 'all') {
            conditions.push(eq(users.role, role as Role));
        }
        
        if (status && status !== 'all') {
            conditions.push(eq(users.status, status as Status));
        }

        // Get total count
        const [{ count: totalCount }] = await db.select({ count: count() }).from(users).where(and(...conditions));

        // Get paginated results
        const query = db.select({
            id: users.id,
            username: users.username,
            email: users.email,
            fullName: users.fullName,
            role: users.role,
            status: users.status,
            avatarUrl: users.avatarUrl,
            createdAt: users.createdAt,
            isVerified: users.isVerified,
            ratingCount: users.ratingCount,
            positiveRatingCount: users.positiveRatingCount,
        }).from(users).where(and(...conditions));
        
        const result = await query
            .orderBy(desc(users.createdAt))
            .limit(limit)
            .offset(offset);

        return {
            users: result,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            }
        };
    },

    // Get user stats (bids count, auctions count)
    getUserStats: async function(userId: number, role?: string | null) {
        // Total bids
        const bidsResult = await db
            .select({ count: count() })
            .from(bids)
            .where(eq(bids.bidderId, userId));
        
        // Total auctions (as seller)
        const auctionsResult = await db
            .select({ count: count() })
            .from(auctions)
            .where(eq(auctions.sellerId, userId));

        // Total auctions still active
        const activeListings = await db
            .select({ count: count() })
            .from(auctions)
            .where(and(eq(auctions.sellerId, userId), eq(auctions.status, 'active')));

        // Total sold auctions
        const soldItems = await db
            .select({ count: count() })
            .from(auctions)
            .where(and(eq(auctions.sellerId, userId), eq(auctions.status, 'sold')));
        
        // Total won auctions
        const wonAuctions = await db
            .select({ count: count() })
            .from(auctions)
            .where(wonBy(userId));

        // Total active bids (auctions where user has placed a bid and auction is still active)
        const activeBids = await db
            .select({ count: count() })
            .from(bids)
            .innerJoin(auctions, eq(auctions.id, bids.auctionId))
            .where(and(eq(bids.bidderId, userId), eq(auctions.status, 'active')))
            .groupBy(auctions.id);

        // Total favourite products
        const favoriteProducts = await db
            .select({ count: count() })
            .from(userFavorites)
            .innerJoin(auctions, eq(auctions.id, userFavorites.auctionId))
            .where(eq(userFavorites.userId, userId));

        // Review statistics - reviews received by this user
        const reviewsReceived = await db
            .select({
                totalReviews: sql<number>`count(*)::int`,
                positiveReviews: sql<number>`count(case when ${reviews.isGoodRating} = true then 1 end)::int`,
                negativeReviews: sql<number>`count(case when ${reviews.isGoodRating} = false then 1 end)::int`,
            })
            .from(reviews)
            .where(eq(reviews.targetId, userId));

        // Review statistics - reviews given by this user
        const reviewsGiven = await db
            .select({
                totalReviews: sql<number>`count(*)::int`,
                positiveReviews: sql<number>`count(case when ${reviews.isGoodRating} = true then 1 end)::int`,
                negativeReviews: sql<number>`count(case when ${reviews.isGoodRating} = false then 1 end)::int`,
            })
            .from(reviews)
            .where(eq(reviews.reviewerId, userId));

        const receivedStats = reviewsReceived[0] || { totalReviews: 0, positiveReviews: 0, negativeReviews: 0 };
        const givenStats = reviewsGiven[0] || { totalReviews: 0, positiveReviews: 0, negativeReviews: 0 };

        // null, not 0: a user without reviews has no rating yet.
        const positiveRate = receivedStats.totalReviews > 0
            ? parseFloat(((receivedStats.positiveReviews / receivedStats.totalReviews) * 100).toFixed(2))
            : null;

        return {
            totalBids: bidsResult[0]?.count || 0,
            totalAuctions: auctionsResult[0]?.count || 0,
            totalActiveListings: activeListings[0]?.count || 0,
            totalSoldItems: soldItems[0]?.count || 0,
            totalWonAuctions: wonAuctions[0]?.count || 0,
            totalActiveBids: activeBids.length,
            totalFavoriteProducts: favoriteProducts[0]?.count || 0,
            reviewsReceived: {
                total: receivedStats.totalReviews,
                positive: receivedStats.positiveReviews,
                negative: receivedStats.negativeReviews,
                positiveRate,
            },
            reviewsGiven: {
                total: givenStats.totalReviews,
                positive: givenStats.positiveReviews,
                negative: givenStats.negativeReviews,
            },
        };
    },

    getById: async function(id: number){
        const result = await db.select().from(users).where(eq(users.id, id));
        return result.length > 0 ? result[0] : null;
    },

    getByEmail: async function(email: string){
        const result = await db.select().from(users).where(eq(users.email, email));
        return result.length > 0 ? result[0] : null;
    },

    getByUsername: async function(username: string){
        const result = await db.select().from(users).where(eq(users.username, username));
        return result.length > 0 ? result[0] : null;
    },


    getByFacebookId: async function(facebookId: string){
        const result = await db.select().from(users).where(eq(users.facebookId, facebookId));
        return result.length > 0 ? result[0] : null;
    },

    create: async function(userData: typeof users.$inferInsert){
        const result = await db.insert(users).values(userData).returning();
        return result[0];
    },

    update: async function(id: number, info: Partial<typeof users.$inferInsert>){
        if(info.createdAt) {
            info.createdAt = new Date(info.createdAt);
        }
        return db.update(users).set(info).where(eq(users.id, id)).returning();
    },


    // Idempotent desired-state write: PUT {favorited:true|false}. Replays and double clicks converge to the same state.
    setFavorite: async function(userId: number, auctionId: number, favorited: boolean) {
        if (favorited) {
            await db.insert(userFavorites).values({ userId, auctionId }).onConflictDoNothing();
        } else {
            await db.delete(userFavorites).where(and(eq(userFavorites.userId, userId), eq(userFavorites.auctionId, auctionId)));
        }
        return favorited;
    },

    listFavoriteIds: async function(userId: number) {
        const rows = await db.select({ auctionId: userFavorites.auctionId }).from(userFavorites).where(eq(userFavorites.userId, userId));
        return rows.map((r) => r.auctionId);
    },

    toggleFavorite: async function(userId: number, auctionId: number) {
        const existingFavorite = await db
            .select()
            .from(userFavorites)
            .where(and(eq(userFavorites.userId, userId), eq(userFavorites.auctionId, auctionId)));

        if (existingFavorite.length > 0) {
            await db.delete(userFavorites).where(and(eq(userFavorites.userId, userId), eq(userFavorites.auctionId, auctionId)));
            return false;
        } else {
            await db.insert(userFavorites).values({ userId, auctionId });
            return true;
        }
    },

}

export default service;


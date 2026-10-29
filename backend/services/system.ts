import db from "../db/index.ts"

import { users, auctions, bids } from "../db/schema.ts"

import { eq, and, sql } from "drizzle-orm";

import dotenv from 'dotenv'

dotenv.config();

const service = {
    getLiveStats: async function(){
        // Total traded success (sold auctions)
        const tradedSuccessQuery = await db
            .select({ count: sql`count(*)::int` })
            .from(auctions)
            .where(eq(auctions.status, 'sold'));

        // Total active bidders (distinct bidders who placed bids)
        const totalActiveBiddersQuery = await db
            .select({ count: sql`count(DISTINCT ${bids.bidderId})::int` })
            .from(bids);

        // Total live auctions
        const liveAuctionsQuery = await db
            .select({ count: sql`count(*)::int` })
            .from(auctions)
            .where(eq(auctions.status, 'active'));

        // Total verified sellers
        const verifiedSellersQuery = await db
            .select({ count: sql`count(*)::int` })
            .from(users)
            .where(and(eq(users.role, 'seller'), eq(users.isVerified, true)));

        return {
            totalTradedSuccess: tradedSuccessQuery[0]?.count || 0,
            totalActiveBidders: totalActiveBiddersQuery[0]?.count || 0,
            totalLiveAuctions: liveAuctionsQuery[0]?.count || 0,
            totalVerifiedSellers: verifiedSellersQuery[0]?.count || 0,
        }
    },
}

export default service;




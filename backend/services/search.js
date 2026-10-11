import db from "../db/index.js"
import { catalogAuction } from "../serializers/index.js";
import { auctions, categories, userFavorites, bids } from "../db/schema.js"
import { sql, eq, or, and, desc, asc, count, inArray, gte, lte, isNull } from "drizzle-orm";

const service = {
    findAll: async function(){
        return db.select().from(auctions);
    },
    findAuctions: async function({
        userId = null,
        q = '',
        category = null,
        minPrice = null,
        maxPrice = null,
        sortBy = 'relevance',
        status = null,
        limit = 20,
        offset = 0,
    }){
        
        // Build WHERE conditions
        const conditions = [];

        let matchedCategoryIds = [];

        // Full-text search condition - MUST MATCH INDEX EXACTLY
        if (q && q.trim()) {
            const searchQuery = q.trim();

            const rows = await db
                .select({ id: categories.id })
                .from(categories)
                .where(
                    sql`to_tsvector('english'::regconfig, 
                        (COALESCE(${categories.name}, ''::character varying))::text
                    ) @@ websearch_to_tsquery('english', ${searchQuery})`
                );

            matchedCategoryIds = rows.map(r => r.id);


            const ftsConditions = [
                sql`to_tsvector('english'::regconfig, 
                    (COALESCE(${auctions.title}, ''::character varying))::text || ' '::text || 
                    COALESCE(${auctions.description}, ''::text)
                ) @@ websearch_to_tsquery('english', ${searchQuery})`
            ];

            if (matchedCategoryIds.length > 0) {
                ftsConditions.push(inArray(auctions.categoryId, matchedCategoryIds));
            }

            conditions.push(sql`(${or(...ftsConditions)})`);
        }

        // Category filter
        let resolvedCategoryId = null;

        if (category && category !== 'All') {
            const cat = await db
                .select({ id: categories.id })
                .from(categories)
                .where(eq(categories.name, category))
                .limit(1);

            if (cat.length) {
                // A parent category also matches lots filed under its children.
                resolvedCategoryId = cat[0].id;
                const children = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, resolvedCategoryId));
                conditions.push(inArray(auctions.categoryId, [resolvedCategoryId, ...children.map((c) => c.id)]));
            }
        }

        if (minPrice) {
            conditions.push(gte(auctions.currentPrice, minPrice.toString()));
        }

        if (maxPrice) {
            conditions.push(lte(auctions.currentPrice, maxPrice.toString()));
        }

        // Status filter
        if (status && status !== 'all') {
            conditions.push(eq(auctions.status, status));
        }

        // Build ORDER BY
        let orderBy;
        switch (sortBy) {
            case 'popularity':
                orderBy = desc(auctions.bidCount);
                break;
            case 'price-asc':
                orderBy = asc(auctions.currentPrice);
                break;
            case 'price-desc':
                orderBy = desc(auctions.currentPrice);
                break;
            case 'ending-soon':
                orderBy = asc(auctions.endTime);
                break;
            case 'newest':
                orderBy = desc(auctions.createdAt);
                break;
            case 'aToZ':
                orderBy = asc(auctions.title);
                break;
            case 'zToA':
                orderBy = desc(auctions.title);
                break;
            case 'relevance':
            default:
                // Sort by relevance when searching, otherwise newest
                if (q && q.trim()) {
                    orderBy = sql`ts_rank(
                        to_tsvector('english'::regconfig, 
                            (COALESCE(${auctions.title}, ''::character varying))::text || ' '::text || 
                            COALESCE(${auctions.description}, ''::text)
                        ),
                        websearch_to_tsquery('english', ${q.trim()})
                    ) DESC`;
                } else {
                    orderBy = desc(auctions.createdAt);
                }
                break;
        }
        
        // Build where clause
        const whereClause = conditions.length > 0 ? and(...conditions) : null;
        
        // Main query
        const results = await db.query.auctions.findMany({
            where: whereClause,
            limit: limit,
            offset: offset,
            orderBy: orderBy,
            with: {
                seller: { columns: { username: true, ratingCount: true, positiveRatingCount: true } },
                category: true,
                images: true,
                // Fetch only the highest bid
                bids: {
                    where: isNull(bids.invalidatedAt),
                    orderBy: [sql`${bids.auctionSequence} DESC NULLS LAST`, desc(bids.amount), desc(bids.id)],
                    limit: 1,
                    with: {
                        bidder: { columns: { id: true, username: true, fullName: true, avatarUrl: true } }
                    }
                }
            }
        });

        const countResult = await db
            .select({ count: count() })
            .from(auctions)
            .where(whereClause);

        const totalItems = countResult.length > 0 ? parseInt(countResult[0].count) : 0;

        let favoriteAuctions = new Set();
        
        if (userId && results.length > 0) {
            const auctionIds = results.map(a => a.id);
            
            const favorites = await db.select({ auctionId: userFavorites.auctionId })
                .from(userFavorites)
                .where(and(
                    eq(userFavorites.userId, userId),
                    inArray(userFavorites.auctionId, auctionIds)
                ));

            favoriteAuctions = new Set(favorites.map(f => f.auctionId));
        }

        return {
            data: results.map(auction => catalogAuction(auction, { isFavorited: favoriteAuctions.has(auction.id) })),
            total: totalItems
        };
    },
}

export default service;
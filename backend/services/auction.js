import db from "../db/index.js"
import { auctions } from "../db/schema.js"
import { sql, eq } from "drizzle-orm";

const service = {
    findAll: async function(){
        return db.select().from(auctions);
    },
    findAuctions: async function({ q, category, minPrice, maxPrice, sortBy, limit, offset }){
        const chunks = [sql`
            SELECT 
                count(*) OVER() as "totalCount",
                a.auction_id as id, 
                a.title, 
                a.current_price as "currentPrice", 
                a.buy_now_price as "buyNowPrice", 
                a.end_time as "endTime", 
                a.created_at as "createdAt", 
                a.bid_count as "bidCount",
                u.full_name as "sellerName", 
                c.name as "categoryName",
                img.image_url as "image",
                
                -- Subquery to find the name of the highest bidder
                (
                    SELECT u2.full_name 
                    FROM bids b 
                    JOIN users u2 ON b.bidder_id = u2.user_id 
                    WHERE b.auction_id = a.auction_id 
                    ORDER BY b.amount DESC 
                    LIMIT 1
                ) as "highestBidder"

            FROM auctions a
            JOIN users u ON a.seller_id = u.user_id
            JOIN categories c ON a.category_id = c.category_id
            LEFT JOIN auction_images img ON a.auction_id = img.auction_id AND img.is_primary = TRUE
            WHERE a.status = 'active'
        `];

        if (q) {
            chunks.push(sql`AND to_tsvector('english', a.title || ' ' || a.description) @@ plainto_tsquery('english', ${q})`);
        }

        if (category && category !== 'All') {
            chunks.push(sql`AND c.name = ${category}`);
        }

        if (minPrice) {
            chunks.push(sql`AND a.current_price >= ${minPrice}`);
        }

        if (maxPrice) {
            chunks.push(sql`AND a.current_price <= ${maxPrice}`);
        }

        switch (sortBy) {
            case 'popularity':
                chunks.push(sql`ORDER BY a.bid_count DESC`);
                break;
            case 'priceLowToHigh':
                chunks.push(sql`ORDER BY a.current_price ASC`);
                break;
            case 'priceHighToLow':
                chunks.push(sql`ORDER BY a.current_price DESC`);
                break;
            case 'timeEndingSoon':
                chunks.push(sql`ORDER BY a.end_time ASC`);
                break;
            case 'newlyListed':
                chunks.push(sql`ORDER BY a.created_at DESC`);
                break;
            default:
                // If user searched (q), sort by Relevance. Otherwise, sort by Newest.
                if (q) {
                    chunks.push(sql`ORDER BY ts_rank(to_tsvector('english', a.title || ' ' || a.description), plainto_tsquery('english', ${q})) DESC`);
                } else {
                    chunks.push(sql`ORDER BY a.created_at DESC`);
                }
        }

        chunks.push(sql`LIMIT ${limit} OFFSET ${offset}`);

        const finalQuery = sql.join(chunks, sql` `);
        const result = await db.execute(finalQuery);

        const totalItems = result.length > 0 ? parseInt(result[0].totalCount) : 0;
        
        return {
            data: result.map(row => ({
                id: row.id,
                title: row.title,
                currentPrice: parseFloat(row.currentPrice),
                buyNowPrice: row.buyNowPrice ? parseFloat(row.buyNowPrice) : null,
                endTime: row.endTime,
                createdAt: row.createdAt,
                bidCount: parseInt(row.bidCount || 0),
                image: row.image || 'https://via.placeholder.com/300',
                category: row.categoryName,
                seller: {
                    name: row.sellerName,
                    avatar: row.sellerAvatar
                }
            })),
            total: totalItems
        };
    },
    findById: async function(id){
        return await db.select().from(auctions).where(eq(auctions.auction_id, id));
    },
    create: async function(auction){
        if(auction.created_at) {
            auction.created_at = new Date(auction.created_at);
        }
        if(auction.end_time) {
            auction.end_time = new Date(auction.end_time);
        }
        return await db.insert(auctions).values(auction).returning();
    },
    update: async function(id, auc){
        if(auc.created_at) {
            auc.created_at = new Date(auc.created_at);
        }
        if(auc.end_time) {
            auc.end_time = new Date(auc.end_time);
        }
        await db.update(auctions).set(auc).where(eq(auctions.auction_id, id));
    },
    delete: async function(id){
        await db.delete(auctions).where(eq(auctions.auction_id, id));
    }
}

export default service;
import db from "../db/index.js"
import { categories, auctions, auctionImages, users, userFavorites, bids, bidderMaxima, descriptionLogs, comments } from "../db/schema.js"
import { catalogAuction, publicBid, publicComment, descriptionLog } from "../serializers/index.js";
import { fromDb, toStr } from "../domain/money.js";
import { minimumNextBid, viewerPosition } from "../domain/bidding.js";
import { checkBidderEligibility, buyNowAvailable } from "../domain/eligibility.js";
import { AppError } from "../utils/errors.js";
import { sanitizeRichText } from "../utils/sanitize.js";
import { sql, and, eq, gte, asc, desc, inArray, isNull, isNotNull } from "drizzle-orm";

// "Won" = the lot is closed and settled with this user as winner. While a lot is active `winnerId` is only the
// current leader, so it must never count as a win. Shared by the profile counter and the Wins tab.
export const wonBy = (userId) =>
    and(eq(auctions.winnerId, userId), inArray(auctions.status, ['sold', 'ended']), isNotNull(auctions.settledAt));

// Latest public price/leader event first (committed per-auction sequence); legacy rows without a sequence fall back to amount, id.
const bidOrder = () => [sql`${bids.auctionSequence} DESC NULLS LAST`, desc(bids.amount), desc(bids.id)];

const service = {
    // Lấy danh sách top các sản phẩm ứng của mục tương ứng (Homepage)
    findByOrder: async function({ 
        userId = null,
        viewId = null,
        status = 'active',
        sortBy = 'newest',
    } = {}) {

        const limit = 5;

        // Sorting Logic
        let orderByClause;

        switch(sortBy) {
            case 'endingSoon':
                orderByClause = [asc(auctions.endTime)];
                break;
            case 'mostBids':
                orderByClause = [desc(auctions.bidCount)];
                break;
            case 'highestPrice':
                orderByClause = [desc(auctions.currentPrice)];
                break;
            default: // 'newest'
                orderByClause = [desc(auctions.createdAt)];
        }

        // Dynamic Conditions
        const whereConditions = [];

        if (status) {
            whereConditions.push(eq(auctions.status, status));
        }

        if (userId) {
            whereConditions.push(eq(auctions.sellerId, userId));
        }

        const whereClause = whereConditions.length > 0 ? and(...whereConditions) : null;

        const foundAuctions = await db.query.auctions.findMany({
            where: whereClause,
            with: {
                images: true,
                seller: { columns: { username: true, ratingCount: true, positiveRatingCount: true } },
                category: true,
                bids: {
                    where: isNull(bids.invalidatedAt),
                    orderBy: bidOrder(),
                    limit: 1,
                    with: { bidder: { columns: { id: true, username: true, fullName: true, avatarUrl: true } } }
                },
            },
            orderBy: orderByClause,
            limit: limit,
        });
        
        let favoriteAuctions = new Set();
        
        if (viewId && foundAuctions.length > 0) {
            const auctionIds = foundAuctions.map(a => a.id);
            
            const favorites = await db.select({ auctionId: userFavorites.auctionId })
                .from(userFavorites)
                .where(and(
                    eq(userFavorites.userId, viewId),
                    inArray(userFavorites.auctionId, auctionIds)
                ));

            favoriteAuctions = new Set(favorites.map(f => f.auctionId));
        }
        
        return foundAuctions.map(auction => catalogAuction(auction, { isFavorited: favoriteAuctions.has(auction.id) }));
    },

    // Lấy danh sách sản phẩm liên quan của mục tương ứng (Profile)
    findByStatus: async function(username, status, category = null) {
        const user = await db.query.users.findFirst({
            where: eq(users.username, username),
            columns: { id: true }
        });

        if (!user) {
            throw new AppError(404, 'NOT_FOUND', "User not found");
        }

        const userId = user.id;

        const conditions = [];

        if (category && category !== 'All Categories') {
            const categoryFilter = await db.query.categories.findFirst({
                where: eq(categories.name, category),
                columns: { id: true }
            });

            if (categoryFilter) {
                conditions.push(eq(auctions.categoryId, categoryFilter.id));
            } else {
                throw new AppError(404, 'NOT_FOUND', "Category not found");
            }
        }

        switch (status) {
            case 'my-listings':
                conditions.push(and(eq(auctions.sellerId, userId), eq(auctions.status, 'active')));
                break;

            case 'sold-items':
                conditions.push(and(eq(auctions.sellerId, userId), eq(auctions.status, 'sold')));
                break;

            case 'won-auctions':
                conditions.push(wonBy(userId));
                break;

            case 'favorites': {
                const myFavs = await db.query.userFavorites.findMany({
                    where: eq(userFavorites.userId, userId),
                    columns: { auctionId: true }
                });
                
                const favIds = myFavs.map(f => f.auctionId);
                
                if (favIds.length === 0) return [];
                
                conditions.push(inArray(auctions.id, favIds));
                break;
            }

            case 'active-bids': {
                const myBids = await db.query.bids.findMany({
                    where: eq(bids.bidderId, userId),
                    columns: { auctionId: true }
                });

                const bidAuctionIds = [...new Set(myBids.map(b => b.auctionId))];

                if (bidAuctionIds.length === 0) return [];

                conditions.push(and(inArray(auctions.id, bidAuctionIds), eq(auctions.status, 'active')));
                break;
            }

            default:
                throw new AppError(400, 'BUSINESS_RULE', "Invalid tab specified");
        }

        const result = await db.query.auctions.findMany({
            where: and(...conditions),
            with: {
                images: true, 
                seller: { columns: { username: true, ratingCount: true, positiveRatingCount: true } },
                category: true,
                bids: {
                    where: isNull(bids.invalidatedAt),
                    orderBy: bidOrder(),
                    limit: 1,
                    with: { bidder: { columns: { id: true, username: true, fullName: true, avatarUrl: true } } }
                }
            },
        });

        let favoriteAuctions = new Set();

        if (status != 'favorites' && result.length > 0) {
            const auctionIds = result.map(a => a.id);
            
            const favorites = await db.select({ auctionId: userFavorites.auctionId })
                .from(userFavorites)
                .where(and(
                    eq(userFavorites.userId, userId),
                    inArray(userFavorites.auctionId, auctionIds)
                ));

            favoriteAuctions = new Set(favorites.map(f => f.auctionId));
        }

        return result.map(auction => catalogAuction(auction, { isFavorited: status === 'favorites' ? true : favoriteAuctions.has(auction.id) }));
    },

    // Tìm thông tin chi tiết 1 sản phẩm (ProductDetail page)
    findById: async function(id, viewer = null) {
        const auction = await db.query.auctions.findFirst({
            where: eq(auctions.id, id),
            with: {
                category: {
                    columns: { id: true, name: true }
                },
                seller: {
                    columns: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatarUrl: true,
                        ratingCount: true,
                        positiveRatingCount: true
                    }
                },
                winner: {
                    columns: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatarUrl: true
                    }
                },
                images: true,
            },
        });

        if (!auction) return null;

        // Calculate seller rating
        const sellerRating = auction.seller.ratingCount > 0 
            ? (auction.seller.positiveRatingCount / auction.seller.ratingCount) * 100 
            : null; // no reviews yet

        // Get primary image
        const primaryImage = auction.images?.find(img => img.isPrimary)?.imageUrl 
            || auction.images?.[0]?.imageUrl 
            || null;

        const [{ now }] = await db.execute(sql`SELECT clock_timestamp() AS now`);
        const capabilities = await this.capabilitiesFor(auction, viewer, now);
        const viewerState = await this.viewerStateFor(auction, viewer, now);

        // Return formatted data for ProductDetail
        return {
            id: auction.id,
            title: auction.title,
            description: sanitizeRichText(auction.description),
            
            // Pricing
            startingPrice: auction.startingPrice,
            currentPrice: auction.currentPrice,
            stepPrice: auction.stepPrice,
            biddingStep: auction.stepPrice, // Alias for frontend compatibility
            buyNowPrice: auction.buyNowPrice,
            
            // Status & Timing
            status: auction.status,
            endTime: auction.endTime,
            createdAt: auction.createdAt,
            autoExtend: auction.autoExtend,
            bidCount: auction.bidCount,
            settledAt: auction.settledAt,
            closeReason: auction.closeReason,
            // Canonical-state metadata: clients order snapshots by version and run countdowns on serverTime.
            version: auction.version,
            serverTime: now,
            minimumNextBid: toStr(minimumNextBid({ startingPrice: fromDb(auction.startingPrice), currentPrice: fromDb(auction.currentPrice), step: fromDb(auction.stepPrice) }, auction.bidCount > 0)),
            capabilities,
            // PRIVATE to the requester (null for guests, the seller and closed lots). Never sent on the public stream.
            viewer: viewerState,
            
            // IDs for role checking
            sellerId: auction.sellerId,
            winnerId: auction.winnerId,
            categoryId: auction.categoryId,
            
            // Seller info
            sellerName: auction.seller?.username,
            seller: {
                id: auction.seller?.id,
                username: auction.seller?.username,
                fullName: auction.seller?.fullName,
                avatarUrl: auction.seller?.avatarUrl,
                rating: sellerRating === null ? null : parseFloat(sellerRating.toFixed(1)),
                ratingCount: auction.seller?.ratingCount || 0,
            },
            
            // Winner info (if auction ended)
            winnerName: auction.winner?.username || null,
            winner: auction.winner ? {
                id: auction.winner.id,
                username: auction.winner.username,
                fullName: auction.winner.fullName,
                avatarUrl: auction.winner.avatarUrl,
            } : null,
            
            // Category
            category: auction.category,
            categoryName: auction.category?.name || 'Uncategorized',
            
            // Images
            image: primaryImage,
            images: auction.images?.map(img => img.imageUrl) || [],
        };
    },

    /** What the viewer may do right now, decided by the same rules the commands enforce (B05/B06). */
    capabilitiesFor: async function(auction, viewer, now) {
        const open = auction.status === 'active' && new Date(now) < new Date(auction.endTime);
        const reasons = {};
        let canBid = false, canBuyNow = false;
        if (!open) {
            reasons.bid = reasons.buyNow = auction.status === 'active' ? 'AUCTION_ENDED' : 'AUCTION_NOT_ACTIVE';
        } else if (!viewer) {
            reasons.bid = reasons.buyNow = 'AUTH_REQUIRED';
        } else {
            const [mine] = await db.select().from(bidderMaxima).where(and(eq(bidderMaxima.auctionId, auction.id), eq(bidderMaxima.bidderId, viewer.id)));
            const denied = checkBidderEligibility(viewer, auction, { disqualified: Boolean(mine?.disqualifiedAt) });
            if (denied) { reasons.bid = reasons.buyNow = denied.code; }
            else {
                canBid = true;
                canBuyNow = buyNowAvailable(auction, now);
                if (!canBuyNow) reasons.buyNow = auction.buyNowPrice === null ? 'NO_BUY_NOW' : 'PRICE_REACHED';
            }
        }
        return { canBid, canBuyNow, reasons };
    },

    /**
     * The signed-in requester's own position on an open lot: { status: 'leading'|'outbid'|'none'|'removed', yourMaximum, minimumBid }.
     * minimumBid follows the bid command's rules for THIS bidder (a leader must go above their own maximum).
     */
    viewerStateFor: async function(auction, viewer, now) {
        const open = auction.status === 'active' && new Date(now) < new Date(auction.endTime);
        if (!viewer || !open || viewer.id === auction.sellerId) return null;
        const rows = await db.select().from(bidderMaxima).where(eq(bidderMaxima.auctionId, auction.id));
        if (rows.some((m) => m.bidderId === viewer.id && m.disqualifiedAt)) return { status: 'removed', yourMaximum: null, minimumBid: null };
        const state = {
            startingPrice: fromDb(auction.startingPrice), step: fromDb(auction.stepPrice), currentPrice: fromDb(auction.currentPrice),
            maxima: rows.filter((m) => !m.disqualifiedAt).map((m) => ({ bidderId: m.bidderId, max: fromDb(m.maxAmount), priority: m.prioritySequence })),
        };
        const p = viewerPosition(state, viewer.id);
        return {
            status: p.isLeading ? 'leading' : p.yourMaximum !== null ? 'outbid' : 'none',
            yourMaximum: p.yourMaximum === null ? null : toStr(p.yourMaximum),
            minimumBid: toStr(p.minimumBid),
        };
    },

    findImages: async function(id) {
        return await db.select().from(auctionImages).where(eq(auctionImages.auctionId, id));
    },

    findBidHistory: async function (auctionId, userId = null, filter = "all", ) {
    const conditions = [eq(bids.auctionId, auctionId)];

    if (filter === "mine") {
        if (!userId) {
            throw new AppError(403, 'FORBIDDEN', "Not Authorization");
        }
        conditions.push(eq(bids.bidderId, userId));
    }

    if (filter === "recent") {
        const recentTime = new Date(Date.now() - 60 * 60 * 1000);
        conditions.push(
            gte(bids.bidTime, recentTime)
        );
    }

    const rows = await db.query.bids.findMany({
            where: and(...conditions),
            orderBy: bidOrder(),
            
            with: {
                bidder: { 
                    columns: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatarUrl: true,
                    }
                }
            }
        });
    return rows.map(publicBid);
    },

    findDescription: async function(id) {
        // Get current description from auctions table
        const auction = await db.query.auctions.findFirst({
            where: eq(auctions.id, id),
            columns: { description: true }
        });

        // Get history from descriptionLogs
        const logs = await db.query.descriptionLogs.findMany({
            where: eq(descriptionLogs.auctionId, id),
            orderBy: [desc(descriptionLogs.editedAt)]
        });

        return {
            description: sanitizeRichText(auction?.description || ""),
            history: logs.map(descriptionLog)
        };
    },

    findComments: async function(id) {
        const rows = await db.query.comments.findMany({
            where: eq(comments.auctionId, id),
            with: {
                user: {
                    columns: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatarUrl: true
                    }
                }
            },
            // Order by oldest first (standard for forums) or newest first
            orderBy: [desc(comments.createdAt)] 
        });
        return rows.map(publicComment);

        // Optional: Organize into a tree structure if your UI needs nested replies
        // This simple version returns a flat list with parent_id included
        // return result.map(comment => ({
        //     ...comment,
        //     user: {
        //         id: comment.user.id,
        //         name: comment.user.fullName || comment.user.username,
        //         avatar: comment.user.avatarUrl
        //     }
        // }));
    },

    // Tạo đấu giá mới (Có Transaction để lưu ảnh an toàn)
    create: async function(info, images) {
        // Chuẩn hóa dữ liệu ngày tháng
        info.createdAt = new Date();
        info.description = sanitizeRichText(info.description);
        info.endTime = new Date(info.endTime);
        info.status = 'active';
        info.bidCount = 0;

        // Thực hiện Transaction (Tạo Auction -> Tạo Images)
        return await db.transaction(async (tx) => {
            // Insert bảng auctions
            const [newAuction] = await tx.insert(auctions).values(info).returning();

            // Insert bảng auction_images (nếu có ảnh)
            if (images && images.length > 0) {
                const imageValues = images.map((image, index) => ({
                    auctionId: newAuction.id,
                    imageUrl: image.path,
                    isPrimary: index === 0
                }));
                await tx.insert(auctionImages).values(imageValues);
            }

            return newAuction;
        });
    },

    upload: async function(images) {
        return await db.insert(auctionImages).values(images).returning();
    },

    createComment: async function(userId, auctionId, content, parentId = null) {
        const result = await db.insert(comments).values({
            userId,
            auctionId,
            content,
            parentId: parentId || null, // Nếu là reply thì có parentId
            createdAt: new Date()
        }).returning();
        
        // Trả về kèm thông tin người comment để Frontend hiển thị ngay
        const newComment = await db.query.comments.findFirst({
            where: eq(comments.commentId, result[0].commentId),
            with: {
                user: {
                    columns: { username: true, fullName: true, avatarUrl: true, role: true }
                }
            }
        });
        
        return publicComment(newComment);
    }

};

export default service;
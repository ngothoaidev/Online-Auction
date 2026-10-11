import db from "../db/index.js"
import { categories, auctions, auctionImages, users, userFavorites, bids, descriptionLogs, comments, orders } from "../db/schema.js"
import { sql, and, or, eq, gte, asc, desc, inArray } from "drizzle-orm";

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
                seller: true,
                category: true,
                bids: {
                    orderBy: [desc(bids.amount)],
                    limit: 1,
                    with: { bidder: true }
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
        
        // Map Result
        return foundAuctions.map(auction => {
            const sellerRating = auction.seller.ratingCount > 0 ? (auction.seller.positiveRatingCount / auction.seller.ratingCount) * 100 : 100;
            return {
                ...auction,
                image: auction.images.find(img => img.isPrimary)?.imageUrl || auction.images[0]?.imageUrl || null,
                seller: {
                    username: auction.seller.username,
                    rating: parseFloat(sellerRating.toFixed(1)),
                },
                category: auction.category?.name || 'Uncategorized',
                bids: auction.bids[0],
                isFavorited: favoriteAuctions.has(auction.id)
        }});
    },

    // Lấy danh sách sản phẩm liên quan của mục tương ứng (Profile)
    findByStatus: async function(username, status, category = null) {
        const user = await db.query.users.findFirst({
            where: eq(users.username, username),
            columns: { id: true }
        });

        if (!user) {
            throw new Error("User not found");
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
                throw new Error("Category not found");
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
                conditions.push(and(eq(auctions.winnerId, userId), or(eq(auctions.status, 'sold'), eq(auctions.status, 'ended'))));
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
                throw new Error("Invalid tab specified");
        }

        const result = await db.query.auctions.findMany({
            where: and(...conditions),
            with: {
                images: true, 
                seller: true,
                category: true,
                bids: {
                    orderBy: [desc(bids.amount)],
                    limit: 1,
                    with: { bidder: true }
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

        return result.map(auction => {
            const sellerRating = auction.seller.ratingCount > 0 ? (auction.seller.positiveRatingCount / auction.seller.ratingCount) * 100 : 100;
            return {
                ...auction,
                image: auction.images.find(img => img.isPrimary)?.imageUrl || auction.images[0]?.imageUrl || null,
                seller: {
                    username: auction.seller.username,
                    rating: parseFloat(sellerRating.toFixed(1)),
                },
                category: auction.category?.name || 'Uncategorized',
                bids: auction.bids[0],
                isFavorited: status === 'favorites' ? true : favoriteAuctions?.has(auction.id)
        }});
    },

    // Tìm thông tin chi tiết 1 sản phẩm (ProductDetail page)
    findById: async function(id) {
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
            : 100;

        // Get primary image
        const primaryImage = auction.images?.find(img => img.isPrimary)?.imageUrl 
            || auction.images?.[0]?.imageUrl 
            || null;

        // Return formatted data for ProductDetail
        return {
            id: auction.id,
            title: auction.title,
            description: auction.description,
            
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
                rating: parseFloat(sellerRating.toFixed(1)),
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

    findImages: async function(id) {
        return await db.select().from(auctionImages).where(eq(auctionImages.auctionId, id));
    },

    findBidHistory: async function (auctionId, userId = null, filter = "all", ) {
    const conditions = [eq(bids.auctionId, auctionId)];

    if (filter === "mine") {
        if (!userId) {
            throw new Error("Not Authorization");
        }
        conditions.push(eq(bids.bidderId, userId));
    }

    if (filter === "recent") {
        const recentTime = new Date(Date.now() - 60 * 60 * 1000);
        conditions.push(
            gte(bids.bidTime, recentTime)
        );
    }

    return await db.query.bids.findMany({
            where: and(...conditions),
            orderBy: [desc(bids.amount)],
            
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
            description: auction?.description || "",
            history: logs
        };
    },

    findComments: async function(id) {
        return await db.query.comments.findMany({
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

    rejectBid: async function (auctionId, bidId, sellerId) {
        return await db.transaction(async (tx) => {
        const auction = await tx.query.auctions.findFirst({
            where: eq(auctions.id, auctionId),
            columns: {
                sellerId: true,
                startingPrice: true,
                status: true
            }
        });

        if (!auction) throw new Error("Auction not found");
        if (auction.sellerId !== sellerId) throw new Error("Unauthorized: Only the seller can reject bids");
        if (auction.status !== 'active') throw new Error("Cannot reject bids on finished auctions");

        const deletedBid = await tx
            .delete(bids)
            .where(and(
                eq(bids.id, bidId),
                eq(bids.auctionId, auctionId)
            ))
            .returning();

        if (deletedBid.length === 0) {
            throw new Error("Bid not found");
        }

        // Recalculate State (Find the NEW highest bid)
        const newHighestBid = await tx.query.bids.findFirst({
            where: eq(bids.auctionId, auctionId),
            orderBy: [desc(bids.amount)],
        });

        // Update Auction (Price reverts to next bid OR starting price if there is no bids)
        const newPrice = newHighestBid ? newHighestBid.amount : auction.startingPrice;

        await tx.update(auctions)
            .set({
                currentPrice: newPrice,
                bidCount: sql`${auctions.bidCount} - 1` // Decrement count safely
            })
            .where(eq(auctions.id, auctionId));

        return { success: true, newPrice };
        });
    },
    
    update: async function(id, auc) {
        if(auc.endTime) auc.endTime = new Date(auc.endTime);
        await db.update(auctions).set(auc).where(eq(auctions.id, id));
    },

    updateDescription: async function(id, description) {
        // Get current description to log history
        const auction = await db.query.auctions.findFirst({
            where: eq(auctions.id, id),
            columns: { description: true }
        });

        // Log current description to history before updating
        if (auction?.description) {
            await db.insert(descriptionLogs).values({
                auctionId: id,
                contentSnapshot: auction.description,
                editedAt: new Date()
            });
        }

        // Update to new description
        const [updated] = await db.update(auctions)
            .set({ description })
            .where(eq(auctions.id, id))
            .returning({ description: auctions.description });

        return updated;
    },

    delete: async function(id){
        await db.delete(auctionImages).where(eq(auctionImages.auctionId, id));
        await db.delete(auctions).where(eq(auctions.id, id));
    },

    placeBid: async function(auctionId, userId, userMaxAmountInput) {
        return await db.transaction(async (tx) => {
            // 1. Lấy thông tin đấu giá và Bid cao nhất hiện tại (để biết ai đang thắng)
            const auction = await tx.query.auctions.findFirst({
                where: eq(auctions.id, auctionId),
                with: { 
                    bids: { 
                        orderBy: [desc(bids.amount)], 
                        limit: 1, // Lấy bid có amount cao nhất (người thắng hiện tại)
                        with: { bidder: true }
                    } 
                } 
            });

            if (!auction) throw new Error("Auction not found");
            if (auction.status !== 'active') throw new Error("Auction is not active");
            if (new Date(auction.endTime) < new Date()) throw new Error("Auction has ended");
            if (auction.sellerId === userId) throw new Error("Seller cannot bid on their own product");

            //CHECK ĐIỂM TÍN NHIỆM (80% RULE)
            // Lấy thông tin Bidder hiện tại (người đang ra giá)
            const bidder = await tx.query.users.findFirst({
                where: eq(users.id, userId)
            });

            if (!bidder) throw new Error("Bidder not found");

            const totalRatings = bidder.ratingCount || 0; // Tổng số lần được đánh giá
            const positiveRatings = bidder.positiveRatingCount || 0; // Số like (+)

            if (totalRatings > 0) {
                // TRƯỜNG HỢP 1: Đã từng được đánh giá
                const scorePercentage = (positiveRatings / totalRatings) * 100;
                if (scorePercentage < 80) {
                    throw new Error(`Your rating score (${scorePercentage.toFixed(1)}%) is too low. Required: 80%`);
                }
            } else {
                // TRƯỜNG HỢP 2: Chưa từng được đánh giá (Newbie)
                // Kiểm tra xem người bán có cho phép không
                if (auction.allowNewbies === false) {
                    throw new Error("This seller does not accept bids from users with no rating history.");
                }
            }
            // Kết thúc check điểm tín nhiệm

            const currentPrice = Number(auction.currentPrice);
            const stepPrice = Number(auction.stepPrice);
            const inputMax = Number(userMaxAmountInput); // Giá trần user vừa nhập

            // Giá sàn hợp lệ cho lần bid này
            const minValidBid = currentPrice + (auction.bidCount === 0 ? 0 : stepPrice);

            if (inputMax < minValidBid) {
                throw new Error(`Bid amount must be at least ${new Intl.NumberFormat('vi-VN').format(minValidBid)}`);
            }

            // 2. Xác định đối thủ hiện tại (Current Winner)
            // Lấy bid cao nhất hiện tại từ DB
            const currentWinnerBid = auction.bids[0]; 
            
            // Lấy 'max_amount' (số tiền đặt cược) bí mật của người đang thắng (nếu có)
            const currentWinnerMaxSecret = currentWinnerBid ? Number(currentWinnerBid.maxAmount || currentWinnerBid.amount) : 0;
            const currentWinnerId = currentWinnerBid ? currentWinnerBid.bidderId : null;

            // --- AUTO BIDDING LOGIC---

            // Trường hợp A: Người dùng tự bid đè lên chính mình (để tăng giá trần)
            if (currentWinnerId === userId) {
                // Chỉ cần tạo một bid mới với amount giữ nguyên (hoặc tăng nhẹ nếu muốn) nhưng maxAmount mới
                // Ở đây ta giữ nguyên giá hiện tại, chỉ cập nhật Max Amount
                await tx.insert(bids).values({
                    auctionId,
                    bidderId: userId,
                    amount: currentPrice, // Giá không đổi
                    maxAmount: inputMax,  // Cập nhật giá trần mới
                    bidTime: new Date()
                });
                return { status: "updated", message: "Your max bid has been updated!", currentPrice };
            }

            // TRƯỜNG HỢP B: Đấu với người khác
            // So sánh Max của User mới (inputMax) vs Max của User cũ (currentWinnerMaxSecret)

            // B1. Nếu User mới bids ít hơn User cũ
            if (currentWinnerBid && inputMax <= currentWinnerMaxSecret) {
                // 1. User mới đặt 1 bid (nhưng sẽ thua)
                await tx.insert(bids).values({
                    auctionId,
                    bidderId: userId,
                    amount: inputMax, // Bid đúng bằng số tiền họ nhập
                    maxAmount: inputMax,
                    bidTime: new Date()
                });

                // 2. Hệ thống tự động đặt bid cho User cũ để thắng lại
                // Giá mới = Giá User mới + Bước giá (nhưng không vượt quá Max của User cũ)
                let autoBidAmount = Math.min(currentWinnerMaxSecret, inputMax + stepPrice);
                
                // Nếu User mới trả bằng đúng Max của User cũ -> User cũ vẫn thắng do đến trước (giữ nguyên giá đó)
                if (inputMax === currentWinnerMaxSecret) {
                    autoBidAmount = currentWinnerMaxSecret;
                }

                await tx.insert(bids).values({
                    auctionId,
                    bidderId: currentWinnerId, // Người cũ
                    amount: autoBidAmount,
                    maxAmount: currentWinnerMaxSecret, // Giữ nguyên max bí mật
                    bidTime: new Date(new Date().getTime() + 100) // +100ms
                });

                // Cập nhật giá sản phẩm
                await tx.update(auctions).set({
                    currentPrice: autoBidAmount,
                    bidCount: (auction.bidCount || 0) + 2,
                    winnerId: currentWinnerId,
                    endTime: (auction.autoExtend && (new Date(auction.endTime) - new Date() < 5 * 60 * 1000)) 
                        ? new Date(new Date(auction.endTime).getTime() + 5 * 60 * 1000) : auction.endTime
                }).where(eq(auctions.id, auctionId));

                return { 
                    status: "outbid", 
                    message: "You have been outbid immediately by an automatic bid!", 
                    currentPrice: autoBidAmount 
                };
            }

            // B2. Nếu User mới bids nhiều hơn User cũ (Thắng)
            else {
                // Giá để thắng người cũ = Max của người cũ + Bước giá
                // Nhưng không được thấp hơn giá sàn (minValidBid)
                let priceToWin = minValidBid;
                
                if (currentWinnerBid) {
                    priceToWin = Math.min(inputMax, currentWinnerMaxSecret + stepPrice);
                }

                // Tạo bid thắng cho User mới
                await tx.insert(bids).values({
                    auctionId,
                    bidderId: userId,
                    amount: priceToWin,
                    maxAmount: inputMax, // Lưu giá trần mới
                    bidTime: new Date()
                });

                // Cập nhật sản phẩm
                await tx.update(auctions).set({
                    currentPrice: priceToWin,
                    bidCount: (auction.bidCount || 0) + 1,
                    winnerId: userId,
                    endTime: (auction.autoExtend && (new Date(auction.endTime) - new Date() < 5 * 60 * 1000)) 
                        ? new Date(new Date(auction.endTime).getTime() + 5 * 60 * 1000) : auction.endTime
                }).where(eq(auctions.id, auctionId));

                return { status: "success", message: "You are the highest bidder!", currentPrice: priceToWin };
            }
        });
    },

    // Buy Now - End auction immediately and create order
    buyNow: async function(auctionId, buyerId) {
        return await db.transaction(async (tx) => {
            // 1. Get auction details
            const auction = await tx.query.auctions.findFirst({
                where: eq(auctions.id, auctionId)
            });


            if (!auction) {
                throw new Error('Auction not found');
            }

            // 2. Validate auction state
            if (auction.status !== 'active') {
                throw new Error('Auction is not active');
            }

            if (!auction.buyNowPrice) {
                throw new Error('This auction does not have a Buy Now option');
            }

            // 3. Prevent seller from buying their own item
            if (auction.sellerId === buyerId) {
                throw new Error('You cannot buy your own auction');
            }

            // 4. End the auction immediately
            await tx.update(auctions).set({
                status: 'ended',
                currentPrice: auction.buyNowPrice,
                winnerId: buyerId,
                endTime: new Date() // End now
            }).where(eq(auctions.id, auctionId));

            console.log("Auction updated, creating order...");

            // 5. Create order for payment
            const [newOrder] = await tx.insert(orders).values({
                auctionId: auctionId,
                buyerId: buyerId,
                sellerId: auction.sellerId,
                finalPrice: String(auction.buyNowPrice), // Convert to string for decimal
                status: 'pending_payment',
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();


            return {
                status: 'success',
                message: 'Purchase successful! Redirecting to payment...',
                orderId: newOrder.id,
                finalPrice: auction.buyNowPrice
            };
        });
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
            where: eq(comments.id, result[0].id),
            with: {
                user: {
                    columns: { username: true, fullName: true, avatarUrl: true, role: true }
                }
            }
        });
        
        return newComment;
    }

};

export default service;
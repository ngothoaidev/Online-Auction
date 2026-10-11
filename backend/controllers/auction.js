import auctionService from "../services/auction.js";

const controller = {
    
    // GET /auctions/top
    listTop: async function(req, res, next) {
        try {
            const { userId, status, sortBy, page, limit } = req.query;
            const viewId = req.user ? req.user.id : null;
            
            const auctions = await auctionService.findByOrder({ 
                userId: userId ? parseInt(userId) : null,
                viewId: viewId ? parseInt(viewId) : null,
                status: status || 'active',
                sortBy: sortBy || 'newest',
                page: page ? parseInt(page) : 1,
                limit: limit ? parseInt(limit) : 5,
            });

            res.json(auctions);
        } catch (error) {
            next(error);
        }
    },

    listProfile: async function(req, res, next) {
        try {
            const { username, status, category } = req.query;

            if (!username || !status) {
                return res.status(400).json({ error: "Missing Required Fields" });
            }

            const results = await auctionService.findByStatus(username, status, category);

            return res.status(200).json(results);

        } catch (error) {
            console.error("Tab Query Error:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    },

    // GET /auctions/:id
    getById: async function(req, res, next) {
        try {
            const id = Number(req.params.id);
            const auction = await auctionService.findById(id);
            
            if (!auction) {
                return res.status(404).json({ message: 'Auction Not Found' });
            }
            
            res.json(auction);
        } catch (error) {
            next(error);
        }
    },

    getBidHistory: async function(req, res, next) {
        try {
            const userId = req.user?.id || null;
            const auctionId = Number(req.params.id);
            const filter = req.query.f || "all";
            const bidHistory = await auctionService.findBidHistory(auctionId, userId, filter);
            
            if (!bidHistory) {
                return res.status(404).json({ message: 'Auction Not Found' });
            }
            
            res.json(bidHistory);
        } catch (error) {
            next(error);
        }
    },

    // GET /auctions/images/:id
    getImages: async function(req, res, next) {
        try {
            const id = Number(req.params.id);
            const images = await auctionService.findImages(id);
            
            if (!images) {
                return res.status(404).json({ message: 'Auction Not Found' });
            }
            
            res.json(images);
        } catch (error) {
            next(error);
        }
    },

    // GET /auctions/description/:id
    getDescription: async function(req, res, next) {
        try {
            const id = Number(req.params.id);
            const logs = await auctionService.findDescription(id);
            console.log("Description: ", logs);
            if (!logs) {
                return res.status(404).json({ message: 'Auction Not Found' });
            }
            
            res.json(logs);
        } catch (error) {
            next(error);
        }
    },

    // GET /auctions/comments/:id
    getComments: async function(req, res, next) {
        try {
            const id = Number(req.params.id);
            const comments = await auctionService.findComments(id);
            
            if (!comments) {
                return res.status(404).json({ message: 'Auction Not Found' });
            }
            
            res.json(comments);
        } catch (error) {
            next(error);
        }
    },

    rejectBid: async (req, res, next) => {
        try {
            const auctionId = Number(req.query.auctionId);
            const bidId = Number(req.query.bidId);
            const sellerId = req.user?.id;


            console.log(auctionId, bidId, sellerId);

            await auctionService.rejectBid(auctionId, bidId, sellerId);

            res.status(200).json({ 
                message: "Bid rejected successfully",
                bidId: bidId 
            });
        } catch (error) {
            next(error);
        }
    },

    // POST /auctions
    create: async function(req, res, next) {
        try {
            const { title, startingPrice, stepPrice, buyNowPrice, endTime, categoryId, description, autoExtend } = req.body;
            const images = req.files;

            // 1. Validate dữ liệu đầu vào
            if (!title || !startingPrice || !stepPrice || !endTime || !categoryId) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            if (Number(stepPrice) <= 0) {
                return res.status(400).json({ message: 'Step price must be positive' });
            }

            if (buyNowPrice && Number(buyNowPrice) <= Number(startingPrice)) {
                return res.status(400).json({ message: 'Buy Now price must be greater than Starting price' });
            }

            if (!images || images.length < 3) {
                return res.status(400).json({ message: 'At least 3 images are required' });
            }

            // 2. Chuẩn bị dữ liệu để lưu
            const info = {
                sellerId: req.user.id, // Lấy ID người đang đăng nhập
                categoryId: Number(categoryId),
                title,
                description,
                startingPrice: Number(startingPrice),
                currentPrice: Number(startingPrice), // Giá hiện tại = Giá khởi điểm lúc tạo
                stepPrice: Number(stepPrice),
                buyNowPrice: buyNowPrice ? Number(buyNowPrice) : null,
                endTime,
                autoExtend: autoExtend || false,
            };

            // 3. Gọi Service
            const auction = await auctionService.create(info, images);

            if (!auction) {
                throw new Error('Failed to insert auction record.');
            }

            return res.status(201).json({
                message: 'Auction created successfully!',
                auction: auction,
            });

        } catch (error) {
            console.error('Create Auction Error:', error);
            return res.status(500).json({ error: error.message });
        }
    },

    // PUT /auctions/:id
    update: async function(req, res, next) {
        try {
            const id = Number(req.params.id);
            
            // Check quyền sở hữu (chỉ người bán mới được sửa)
            const existingAuction = await auctionService.findById(id);
            if (!existingAuction) {
                return res.status(404).json({ message: 'Auction Not Found' });
            }
            
            if (existingAuction.sellerId !== req.user.id) {
                return res.status(403).json({ message: 'Unauthorized to update this auction' });
            }

            const updatedAuction = await auctionService.update(id, req.body);
            res.json(updatedAuction);
        } catch (error) {
            next(error);
        }
    },

    //POST /auctions/:id/comments
    postComment: async function(req, res, next) {
        try {
            const auctionId = Number(req.params.id);
            const userId = req.user.id; // Lấy từ token
            const { content, parentId } = req.body;

            if (!content || content.trim() === "") {
                return res.status(400).json({ message: "Comment content is required" });
            }

            const comment = await auctionService.createComment(userId, auctionId, content, parentId);
            res.status(201).json(comment);
        } catch (error) {
            next(error);
        }
    },

    // PUT /auctions/:id/description
    updateDescription: async function(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { description } = req.body;
            
            // Check if auction exists
            const existingAuction = await auctionService.findById(id);
            if (!existingAuction) {
                return res.status(404).json({ message: 'Auction Not Found' });
            }
            
            // Check ownership (only seller can update)
            if (existingAuction.sellerId !== req.user.id) {
                return res.status(403).json({ message: 'Unauthorized to update this auction' });
            }

            // Update description
            const updatedAuction = await auctionService.updateDescription(id, description);
            res.json({ message: 'Description updated successfully', description: updatedAuction.description });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /auctions/:id
    delete: async function(req, res, next) {
        try {
            const id = Number(req.params.id);

            const existingAuction = await auctionService.findById(id);
            if (!existingAuction) {
                return res.status(404).json({ message: 'Auction Not Found' });
            }

            // Check quyền (Admin hoặc chính chủ mới được xóa)
            if (req.user.role !== 'admin' && existingAuction.sellerId !== req.user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            await auctionService.delete(id);
            res.json({ message: 'Deleted successfully' });
        } catch (error) {
            next(error);
        }
    },

    // POST /auctions/:id/bid
    placeBid: async function(req, res, next) {
        try {
            const auctionId = Number(req.params.id);
            const userId = req.user.id; // Lấy từ token
            const { amount } = req.body; // Đây là "Max Bid" mà user nhập

            if (!amount || Number(amount) <= 0) {
                return res.status(400).json({ message: 'Invalid bid amount' });
            }

            const result = await auctionService.placeBid(auctionId, userId, amount);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    },

    // POST /auctions/:id/buy-now
    buyNow: async function(req, res, next) {
        try {
            const auctionId = Number(req.params.id);
            const buyerId = req.user.id;

            console.log(`Buy Now request - Auction: ${auctionId}, Buyer: ${buyerId}`);

            const result = await auctionService.buyNow(auctionId, buyerId);
            res.status(200).json(result);
        } catch (error) {
            console.error("Buy Now Error:", error.message, error.stack);
            // Pass specific error messages to client
            if (error.message) {
                return res.status(400).json({ message: error.message });
            }
            next(error);
        }
    }
}

export default controller;
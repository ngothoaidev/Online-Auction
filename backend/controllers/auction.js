import auctionService from "../services/auction.js";
import { commands } from "../services/auctionCommands.js";
import { keyFrom } from "../services/idempotency.js";
import { streamAuction } from "../services/realtime.js";

// Idempotency-Key is optional on the API; the SPA always sends one per reviewed bid.
const idempotencyKey = keyFrom;

const controller = {
    
    // GET /auctions/top
    listTop: async function(req, res, next) {
        try {
            const { userId, status, sortBy } = req.query;
            const viewId = req.user ? req.user.id : null;
            
            const auctions = await auctionService.findByOrder({ 
                userId: userId ?? null,
                viewId,
                status,
                sortBy,
            });

            res.json(auctions);
        } catch (error) {
            next(error);
        }
    },

    listProfile: async function(req, res, next) {
        try {
            const { username, status, category } = req.query;

            const results = await auctionService.findByStatus(username, status, category);

            return res.status(200).json(results);

        } catch (error) {
            next(error);
        }
    },

    // GET /auctions/:id
    getById: async function(req, res, next) {
        try {
            const id = Number(req.params.id);
            const auction = await auctionService.findById(id, req.user ?? null);
            
            if (!auction) {
                return res.status(404).json({ message: 'Auction Not Found' });
            }
            
            // A signed-in response carries the requester's private position: never store or share it in a cache.
            if (req.user) res.set('Cache-Control', 'private, no-store');
            res.json(auction);
        } catch (error) {
            next(error);
        }
    },

    events: async function(req, res, next) {
        try {
            await streamAuction(req, res, Number(req.params.id));
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

    // DELETE /auction/reject?auctionId=&bidId=[&reason=]  (kept for compatibility; semantics = disqualify the bidder)
    rejectBid: async (req, res, next) => {
        try {
            const { auctionId, bidId, reason } = req.query;
            const result = await commands.rejectBidder({ auctionId, bidId, actor: req.user, reason });
            res.status(200).json({ ...result, bidId });
        } catch (error) {
            next(error);
        }
    },

    // POST /auctions
    create: async function(req, res, next) {
        try {
            // req.body was validated/coerced by createAuctionBody (money as digit strings, real booleans, sanitized HTML)
            const images = req.files;
            if (!images || images.length < 3) {
                return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'At least 3 images are required' });
            }

            const info = { ...req.body, sellerId: req.user.id, currentPrice: req.body.startingPrice };

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
            next(error);
        }
    },

    // PUT /auction/:id  (body already restricted to title/description/categoryId)
    update: async function(req, res, next) {
        try {
            const id = req.params.id;
            await commands.updateListing({ auctionId: id, actor: req.user, fields: req.body });
            res.json(await auctionService.findById(id, req.user));
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

    // PUT /auction/:id/description
    updateDescription: async function(req, res, next) {
        try {
            const id = req.params.id;
            await commands.updateListing({ auctionId: id, actor: req.user, fields: { description: req.body.description } });
            const { description } = await auctionService.findDescription(id);
            res.json({ message: 'Description updated successfully', description });
        } catch (error) {
            next(error);
        }
    },

    // DELETE /auction/:id  — cancels the lot (soft); bids, history and orders are never hard-deleted
    delete: async function(req, res, next) {
        try {
            const result = await commands.cancelListing({ auctionId: Number(req.params.id), actor: req.user, reason: req.query.reason ?? req.body?.reason });
            res.json({ ...result, message: 'Cancelled successfully' });
        } catch (error) {
            next(error);
        }
    },

    // POST /auction/:id/bid  (body.amount = the bidder's private maximum; optional Idempotency-Key header)
    placeBid: async function(req, res, next) {
        try {
            const result = await commands.placeBid({ auctionId: req.params.id, actor: req.user, amount: req.body.amount, key: idempotencyKey(req) });
            res.set('Idempotent-Replayed', String(Boolean(result.replayed))).status(result.status).json(result.body);
        } catch (error) {
            next(error);
        }
    },

    // POST /auction/:id/buy-now
    buyNow: async function(req, res, next) {
        try {
            const result = await commands.buyNow({ auctionId: req.params.id, actor: req.user, key: idempotencyKey(req) });
            res.set('Idempotent-Replayed', String(Boolean(result.replayed))).status(result.status).json(result.body);
        } catch (error) {
            next(error);
        }
    }
}

export default controller;

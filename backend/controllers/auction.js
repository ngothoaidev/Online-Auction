import auctionService from "../services/auction.js";

const controller = {
    
    // GET /auctions
    listAuctions: async function(req, res, next) {
        try {
            const auctions = await auctionService.findAll();
            res.json(auctions);
        } catch (error) {
            next(error);
        }
    },

    // GET /auctions/search
    findAuctions: async function(req, res, next) {
        try {
            const { q, category, minPrice, maxPrice, sortBy, page } = req.query;
            
            const pageNum = parseInt(page) || 1;
            const limit = 12;
            const offset = (pageNum - 1) * limit;

            const { data, total } = await auctionService.findAuctions({
                q,
                category,
                minPrice: minPrice ? parseFloat(minPrice) : null,
                maxPrice: maxPrice ? parseFloat(maxPrice) : null,
                sortBy,
                limit,
                offset
            });

            res.json({
                data,
                total,
                currentPage: pageNum,
                totalPages: Math.ceil(total / limit)
            });
        } catch (error) {
            next(error);
        }
    },

    // GET /auctions/:id
    getAuction: async function(req, res, next) {
        try {
            const id = Number(req.params.id);
            const auction = await auctionService.findById(id);
            
            if (!auction) {
                res.status(404);
                throw new Error('Auction Not Found');
            }
            
            res.json(auction);
        } catch (error) {
            next(error);
        }
    },

    // POST /auctions
    createAuction: async function(req, res, next) {
        try {
            const auction = await auctionService.create(req.body);
            res.status(201).json(auction);
        } catch (error) {
            next(error);
        }
    },

    // PUT /auctions/:id
    updateAuction: async function(req, res, next) {
        try {
            const id = Number(req.params.id);
            
            // 1. Check if it exists
            const existingAuction = await auctionService.findById(id);
            if (!existingAuction) {
                res.status(404);
                throw new Error('Auction Not Found');
            }

            // 2. Update
            const updatedAuction = await auctionService.update(id, req.body);
            res.json(updatedAuction);
        } catch (error) {
            next(error);
        }
    },

    // DELETE /auctions/:id
    deleteAuction: async function(req, res, next) {
        try {
            const id = Number(req.params.id);

            // 1. Check if it exists
            const existingAuction = await auctionService.findById(id);
            if (!existingAuction) {
                res.status(404);
                throw new Error('Auction Not Found');
            }

            // 2. Delete
            await auctionService.delete(id);
            res.json({}); // Return empty JSON on success
        } catch (error) {
            next(error);
        }
    }
}

export default controller;
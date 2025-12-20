import { Router } from "express";
import auctionController from "../controllers/auction.js"

const route = new Router();

// GET: All Auctions
route.get('/', auctionController.listAuctions);

// GET: Find Auctions
route.get('/search', auctionController.findAuctions);

// Get: Specific Auction
route.get('/:id', auctionController.getAuction);

// POST: Create New Auction
route.post('/', auctionController.createAuction);

// PUT: Update Specific Auction
route.put('/:id', auctionController.updateAuction);

// DELETE: Remove Specific Auction
route.delete('/:id', auctionController.deleteAuction);

export default route;
import { Router } from "express";
import { requireAuth, requireSeller, requireVerified } from "../middleware/auth.js";
import auctionController from "../controllers/auction.js"
import { validate, idParam } from "../validation/index.js";
import { createAuctionBody, updateAuctionBody, descriptionBody, commentBody, bidBody, bidHistoryQuery } from "../validation/auction.js";
import { topQuery, profileQuery, rejectQuery } from "../validation/search.js";
import { actionLimiter } from "../middleware/rateLimit.js";
import { uploadProductImage } from "../config/cloudinary.js";

const route = new Router();

// GET: Top Auctions
route.get('/top', validate({ query: topQuery }), auctionController.listTop);

// GET: Personal Auctions
route.get('/profile', validate({ query: profileQuery }), auctionController.listProfile);

// GET: Auction Images
route.get('/images/:id', validate({ params: idParam }), auctionController.getImages);

// GET: Auction Bids
route.get('/bids/:id', validate({ params: idParam, query: bidHistoryQuery }), auctionController.getBidHistory);

// GET: Auction Description
route.get('/description/:id', validate({ params: idParam }), auctionController.getDescription);

// GET: Auction Comments
route.get('/comments/:id', validate({ params: idParam }), auctionController.getComments);

// Get: Specific Auction
route.get('/:id', validate({ params: idParam }), auctionController.getById);

route.use(requireAuth);

// POST: Create New Auction
route.post('/', requireSeller, actionLimiter('upload'), uploadProductImage.array('images', 10), validate({ body: createAuctionBody }), auctionController.create);

route.delete('/reject', validate({ query: rejectQuery }), auctionController.rejectBid);

// PUT: Update Specific Auction
route.put('/:id', requireSeller, validate({ params: idParam, body: updateAuctionBody }), auctionController.update);

// PUT: Update Auction Description (seller only)
route.put('/:id/description', requireSeller, validate({ params: idParam, body: descriptionBody }), auctionController.updateDescription);

// DELETE: Remove Specific Auction
route.delete('/:id', validate({ params: idParam }), auctionController.delete);

// POST: Place a bid (Auto Bidding supported)
route.post('/:id/bid', requireVerified, actionLimiter('bid'), validate({ params: idParam, body: bidBody }), auctionController.placeBid);

//Route đăng comment
route.post('/:id/comments', requireVerified, actionLimiter('comment'), validate({ params: idParam, body: commentBody }), auctionController.postComment);

// POST: Buy Now - End auction immediately at buyNowPrice
route.post('/:id/buy-now', requireVerified, actionLimiter('bid'), validate({ params: idParam }), auctionController.buyNow);

export default route;
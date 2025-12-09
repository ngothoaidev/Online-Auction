import express from 'express';
import productController from '../controllers/product.controller.js';

const router = express.Router();

/**
 * GET all products
 * Query params: status, category, sellerId
 */
router.get('/', productController.listProducts);

// /**
//  * GET active products only
//  */
// router.get('/active/list', productController.getActiveProducts);

// /**
//  * GET products by seller ID
//  */
// router.get('/seller/:sellerId', productController.getProductsBySeller);

/**
 * GET product by ID
 */
router.get('/:id', productController.getProduct);

/**
 * POST create a new product
 * Body: { name, description, price, startingBid, currentBid, category, imageUrl, status, sellerId, auctionEndTime }
 */
router.post('/', productController.createProduct);

/**
 * PUT update a product
 * Body: { name, description, price, startingBid, currentBid, category, imageUrl, status, auctionEndTime }
 */
router.put('/:id', productController.updateProduct);

/**
 * DELETE a product
 */
router.delete('/:id', productController.deleteProduct);

export default router;

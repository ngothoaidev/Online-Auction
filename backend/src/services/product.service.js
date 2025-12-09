import db from '../config/db.js';
import { products } from '../models/product.model.js';
import { eq } from 'drizzle-orm';

const productService = {
    /**
     * Get all products with optional filters
    */
//   async findAll(filters = {}) {
//     try {
//       let query = db.select().from(products);
      
//       // Apply filters if provided
//       if (filters.status) {
//         query = query.where(eq(products.status, filters.status));
//       }
//       if (filters.category) {
//         query = query.where(eq(products.category, filters.category));
//       }
//       if (filters.sellerId) {
//         query = query.where(eq(products.sellerId, parseInt(filters.sellerId)));
//       }
      
//       const result = await query;
//       return result;
//     } catch (error) {
//       throw new Error(`Error fetching products: ${error.message}`);
//     }
//   },
    findAll: async function() {
        return db.select().from(products);
    },

    /**
     * Get product by ID
   */
    findById: async function (id) {
        try {
        const result = await db
            .select()
            .from(products)
            .where(eq(products.id, id))
            .limit(1);
        
        return result.length > 0 ? result[0] : null;
        } catch (error) {
        throw new Error(`Error fetching product: ${error.message}`);
        }
    },

    /**
     * Create a new product
    */
    create: async function (product) {
        try {
        // Validate required fields
        if (!product.name || !product.price || !product.sellerId) {
            throw new Error('Name, price, and sellerId are required');
        }

        // Convert auctionEndTime to Date if it's a string
        if (product.auctionEndTime && typeof product.auctionEndTime === 'string') {
            product.auctionEndTime = new Date(product.auctionEndTime);
        }

        const result = await db.insert(products).values(product).returning();
        return result[0];
        } catch (error) {
        throw new Error(`Error creating product: ${error.message}`);
        }
    },

    /**
     * Update a product
    */
    async update( id, product ) {
        try {
            console.log('Updating product with data:', product);
            const updateData = {};
            if (product.name !== undefined) updateData.name = product.name;
            if (product.description !== undefined) updateData.description = product.description;
            if (product.price !== undefined) updateData.price = parseFloat(product.price);
            if (product.startingBid !== undefined) updateData.startingBid = parseFloat(product.startingBid);
            if (product.currentBid !== undefined) updateData.currentBid = parseFloat(product.currentBid);
            if (product.category !== undefined) updateData.category = product.category;
            if (product.imageUrl !== undefined) updateData.imageUrl = product.imageUrl;
            if (product.status !== undefined) updateData.status = product.status;
            if (product.auctionEndTime !== undefined) { updateData.auctionEndTime = product.auctionEndTime ? new Date(product.auctionEndTime) : null; }
            updateData.updatedAt = new Date();

            const result = await db
                .update(products)
                .set(updateData)
                .where(eq(products.id, id))
                .returning();
            return result[0];
        } catch (error) {
        throw new Error(`Error updating product: ${error.message}`);
        }
    },

    /**
     * Delete a product
    */
    async delete(id) {
        try {
        const result = await db
            .delete(products)
            .where(eq(products.id, parseInt(id)))
            .returning();

        return result[0];
        } catch (error) {
        throw new Error(`Error deleting product: ${error.message}`);
        }
    },

    /**
     * Get products by seller ID
    */
    async findBySellerId(sellerId) {
        try {
        const result = await db
            .select()
            .from(products)
            .where(eq(products.sellerId, parseInt(sellerId)));

        return result;
        } catch (error) {
        throw new Error(`Error fetching products by seller: ${error.message}`);
        }
    },

    /**
     * Get active products
     */
    async findActive() {
        try {
        const result = await db
            .select()
            .from(products)
            .where(eq(products.status, 'active'));

        return result;
        } catch (error) {
        throw new Error(`Error fetching active products: ${error.message}`);
        }
    }
};

export default productService;

import db from "../db/index.ts";
import { categories, auctions } from "../db/schema.ts";
import { eq, isNull, count, sql } from "drizzle-orm";

const service = {
    findAll: async function(){
        const mainCategories = await db.select({
            id: categories.id,
            name: categories.name,
        }).from(categories).where(isNull(categories.parentId));
        const categoriesWithSub = [];
        for (const mainCat of mainCategories) {
            const subCategories = await db.select({
                id: categories.id,
                name: categories.name,
            }).from(categories).where(eq(categories.parentId, mainCat.id));
            categoriesWithSub.push({
                ...mainCat,
                subcategories: subCategories
            });
        }
        return categoriesWithSub;
    },

    // Get all categories with subcategories and product counts for admin
    findAllWithProductCount: async function() {
        // Get main categories (parentId is null)
        const mainCategories = await db.select({
            id: categories.id,
            name: categories.name,
            description: categories.description,
        }).from(categories).where(isNull(categories.parentId));

        const result = [];
        
        for (const mainCat of mainCategories) {
            // Get subcategories for this main category
            const subCategories = await db.select({
                id: categories.id,
                name: categories.name,
                description: categories.description,
            }).from(categories).where(eq(categories.parentId, mainCat.id));

            // Get product count for each subcategory
            const subcategoriesWithCount = [];
            let totalProductCount = 0;

            for (const subCat of subCategories) {
                const productCountResult = await db
                    .select({ count: count() })
                    .from(auctions)
                    .where(eq(auctions.categoryId, subCat.id));
                
                const productCount = productCountResult[0]?.count || 0;
                totalProductCount += productCount;

                subcategoriesWithCount.push({
                    ...subCat,
                    productCount: productCount,
                });
            }

            // Also count products directly in main category (if any)
            const mainCatProductCount = await db
                .select({ count: count() })
                .from(auctions)
                .where(eq(auctions.categoryId, mainCat.id));
            
            totalProductCount += mainCatProductCount[0]?.count || 0;

            result.push({
                ...mainCat,
                productCount: totalProductCount,
                subcategories: subcategoriesWithCount,
            });
        }

        return result;
    },

    // Get by ID
    getById: async function(id) {
        const result = await db.select().from(categories).where(eq(categories.id, id));
        return result.length > 0 ? result[0] : null;
    },

    // Create a category
    create: async function(name, parentId = null, description = null) {
        const result = await db.insert(categories).values({
            name,
            parentId,
            description,
        }).returning();
        return result[0];
    },

    // Update a category
    update: async function(id, data) {
        const result = await db
            .update(categories)
            .set(data)
            .where(eq(categories.id, id))
            .returning();
        return result[0];
    },

    // Delete a category
    delete: async function(id) {
        return db.delete(categories).where(eq(categories.id, id));
    },

    // Check if category has products
    hasProducts: async function(categoryId) {
        const result = await db
            .select({ count: count() })
            .from(auctions)
            .where(eq(auctions.categoryId, categoryId));
        return (result[0]?.count || 0) > 0;
    },

    // Check if category has subcategories
    hasSubcategories: async function(categoryId) {
        const result = await db
            .select({ count: count() })
            .from(categories)
            .where(eq(categories.parentId, categoryId));
        return (result[0]?.count || 0) > 0;
    },

    // Get subcategories of a category
    getSubcategories: async function(parentId) {
        return db.select().from(categories).where(eq(categories.parentId, parentId));
    },
}

export default service;
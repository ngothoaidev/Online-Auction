import db from "../db/index.ts";
import { categories, auctions } from "../db/schema.ts";
import { eq, isNull, count } from "drizzle-orm";

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
}

export default service;
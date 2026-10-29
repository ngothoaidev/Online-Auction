import searchService from "../services/search.js";

const controller = {
    
    // GET /search
    searchAuctions: async function(req, res, next) {
        try {
            const userId = req.user?.id;
            const { q, category, minPrice, maxPrice, sortBy, page, status } = req.query;
            const pageNum = Math.min(Math.max(parseInt(page) || 1, 1), 10000);
            const limit = 12;
            const offset = (pageNum - 1) * limit;
            
            const result = await searchService.findAuctions({
                userId,
                q,
                category,
                minPrice: minPrice ? parseFloat(minPrice) : null,
                maxPrice: maxPrice ? parseFloat(maxPrice) : null,
                sortBy,
                limit,
                offset,
                status
            });
        
            res.json({
                data: result.data,
                metadata:{
                    page: pageNum,
                    totalPages: Math.ceil(result.total / limit),
                    totalItems: result.total,
                    itemsInPage: result.data.length
                },
            });
        } catch (error) {
            next(error);
        }
    },

    // GET /search/favorites
    searchFavorites: async function(req, res, next) {
        try {
            const { q, category, minPrice, maxPrice, sortBy, page, status } = req.query;
            const pageNum = parseInt(page) || 1;
            const limit = 12;
            const offset = (pageNum - 1) * limit;
            
            const result = await searchService.findFavorites({
                q,
                category,
                minPrice: minPrice ? parseFloat(minPrice) : null,
                maxPrice: maxPrice ? parseFloat(maxPrice) : null,
                sortBy,
                limit,
                offset,
                status
            });
        
            res.json({
                data: result.data,
                metadata:{
                    page: pageNum,
                    totalPages: Math.ceil(result.total / limit),
                    totalItems: result.total,
                    itemsInPage: result.data.length
                },
            });
        } catch (error) {
            next(error);
        }
    },  

}

export default controller;
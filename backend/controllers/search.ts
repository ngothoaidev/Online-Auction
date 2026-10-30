import type { Request, Response, NextFunction } from "express";
import searchService from "../services/search.ts";
import { parsed } from "../validation/index.ts";
import { searchQuery } from "../validation/search.ts";

const controller = {
    
    // GET /search
    searchAuctions: async function(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            const { q, category, minPrice, maxPrice, sortBy, page, status } = parsed(searchQuery, req.query);
            const pageNum = Math.min(Math.max(page || 1, 1), 10000);
            const limit = 12;
            const offset = (pageNum - 1) * limit;
            
            const result = await searchService.findAuctions({
                userId,
                q,
                category,
                minPrice: minPrice || null,
                maxPrice: maxPrice || null,
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
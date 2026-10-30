import type { Request, Response, NextFunction } from "express";
import systemService from "../services/system.ts";

const controller = {
    
    // GET /stats 
    getLiveStats: async function(req: Request, res: Response, next: NextFunction) {
        try {
            console.log("Fetching live stats...");
            const stats = await systemService.getLiveStats();
            res.json(stats);
        } catch (error) {
            next(error);
        }
    },

}

export default controller;
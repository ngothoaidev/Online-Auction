import type { Request, Response, NextFunction } from "express";
import { reviewService } from "../services/review.ts";

export const reviewController = {
  /**
   * Get all reviews with optional filters
   * Query params: reviewerId, targetId, auctionId, page, limit
   */
  async getReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const { 
        reviewerId, 
        targetId,
        auctionId, 
        page = 1, 
        limit = 20 
      } = req.query;

      const filters: { reviewerId?: number; targetId?: number; auctionId?: number } = {};
      if (reviewerId) filters.reviewerId = parseInt(String(reviewerId));
      if (targetId) filters.targetId = parseInt(String(targetId));
      if (auctionId) filters.auctionId = parseInt(String(auctionId));

      const pagination = {
        page: parseInt(String(page)),
        limit: parseInt(String(limit)),
      };

      const result = await reviewService.getReviews(filters, pagination);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get review statistics
   * Query params: reviewerId, targetId, auctionId
   */
  async getReviewStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { reviewerId, targetId, auctionId } = req.query;

      const filters: { reviewerId?: number; targetId?: number; auctionId?: number } = {};
      if (reviewerId) filters.reviewerId = parseInt(String(reviewerId));
      if (targetId) filters.targetId = parseInt(String(targetId));
      if (auctionId) filters.auctionId = parseInt(String(auctionId));

      const stats = await reviewService.getReviewStats(filters);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a single review by ID
   * Params: id
   */
  async getReviewById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const review = await reviewService.getReviewById(parseInt(id));

      if (!review) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: review,
      });
    } catch (error) {
      next(error);
    }
  },
};

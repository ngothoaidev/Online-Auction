import { reviewService } from "../services/review.ts";

export const reviewController = {
  /**
   * Get all reviews with optional filters
   * Query params: reviewerId, targetId, auctionId, page, limit
   */
  async getReviews(req, res, next) {
    try {
      const { 
        reviewerId, 
        targetId,
        auctionId, 
        page = 1, 
        limit = 20 
      } = req.query;

      const filters = {};
      if (reviewerId) filters.reviewerId = parseInt(reviewerId);
      if (targetId) filters.targetId = parseInt(targetId);
      if (auctionId) filters.auctionId = parseInt(auctionId);

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
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
  async getReviewStats(req, res, next) {
    try {
      const { reviewerId, targetId, auctionId } = req.query;

      const filters = {};
      if (reviewerId) filters.reviewerId = parseInt(reviewerId);
      if (targetId) filters.targetId = parseInt(targetId);
      if (auctionId) filters.auctionId = parseInt(auctionId);

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
  async getReviewById(req, res, next) {
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

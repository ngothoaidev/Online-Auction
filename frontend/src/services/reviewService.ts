const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type ReviewFilters = { reviewerId?: number | string; targetId?: number | string; auctionId?: number | string; page?: number; limit?: number };

export const reviewService = {
  /**
   * Get all reviews with optional filters
   * @param {Object} filters - { reviewerId, targetId, auctionId, page, limit }
   * @returns {Promise<Object>} Response with reviews, pagination, and stats
   */
  getReviews: async (filters: ReviewFilters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.reviewerId) params.append('reviewerId', String(filters.reviewerId));
    if (filters.targetId) params.append('targetId', String(filters.targetId));
    if (filters.auctionId) params.append('auctionId', String(filters.auctionId));
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const res = await fetch(`${API_URL}/reviews?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  /**
   * Get review statistics
   * @param {Object} filters - { reviewerId, targetId, auctionId }
   * @returns {Promise<Object>} Statistics object
   */
  getReviewStats: async (filters: ReviewFilters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.reviewerId) params.append('reviewerId', String(filters.reviewerId));
    if (filters.targetId) params.append('targetId', String(filters.targetId));
    if (filters.auctionId) params.append('auctionId', String(filters.auctionId));

    const res = await fetch(`${API_URL}/reviews/stats?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch review stats');
    return res.json();
  },

  /**
   * Get a single review by ID
   * @param {number} id - Review ID
   * @returns {Promise<Object>} Review object
   */
  getReviewById: async (id: number | string) => {
    const res = await fetch(`${API_URL}/reviews/${id}`);
    if (!res.ok) throw new Error('Failed to fetch review');
    return res.json();
  },
};

import db from "../db/index.ts";
import { reviews, users, auctions } from "../db/schema.ts";
import { eq, desc, sql, and } from "drizzle-orm";

export const reviewService = {
  /**
   * Get all reviews with reviewer, target user, and auction info
   * @param {Object} filters - Filter options (reviewerId, targetId, auctionId)
   * @param {Object} pagination - Pagination options (page, limit)
   * @returns {Promise<{reviews: Array, pagination: Object, stats: Object}>}
   */
  async getReviews(filters = {}, pagination = { page: 1, limit: 20 }) {
    const { reviewerId, targetId, auctionId } = filters;
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (reviewerId) conditions.push(eq(reviews.reviewerId, reviewerId));
    if (targetId) conditions.push(eq(reviews.targetId, targetId));
    if (auctionId) conditions.push(eq(reviews.auctionId, auctionId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get reviews with relations
    const reviewsList = await db
      .select({
        id: reviews.id,
        reviewerId: reviews.reviewerId,
        targetId: reviews.targetId,
        auctionId: reviews.auctionId,
        isGoodRating: reviews.isGoodRating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        // Reviewer info
        reviewerUsername: sql`reviewer.username`,
        reviewerFullName: sql`reviewer.full_name`,
        reviewerAvatarUrl: sql`reviewer.avatar_url`,
        // Target user info
        targetUsername: sql`target_user.username`,
        targetFullName: sql`target_user.full_name`,
        targetAvatarUrl: sql`target_user.avatar_url`,
        // Auction info
        auctionTitle: auctions.title,
        auctionStatus: auctions.status,
      })
      .from(reviews)
      .leftJoin(sql`users as reviewer`, sql`reviewer.user_id = ${reviews.reviewerId}`)
      .leftJoin(sql`users as target_user`, sql`target_user.user_id = ${reviews.targetId}`)
      .leftJoin(auctions, eq(reviews.auctionId, auctions.id))
      .where(whereClause)
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(reviews)
      .where(whereClause);

    // Get review statistics
    const stats = await this.getReviewStats(filters);

    return {
      reviews: reviewsList,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
      stats,
    };
  },

  /**
   * Get review statistics
   * @param {Object} filters - Filter options (targetId, reviewerId, auctionId)
   * @returns {Promise<Object>} Statistics object
   */
  async getReviewStats(filters = {}) {
    const { reviewerId, targetId, auctionId } = filters;

    // Build where conditions
    const conditions = [];
    if (reviewerId) conditions.push(eq(reviews.reviewerId, reviewerId));
    if (targetId) conditions.push(eq(reviews.targetId, targetId));
    if (auctionId) conditions.push(eq(reviews.auctionId, auctionId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [stats] = await db
      .select({
        totalReviews: sql`count(*)::int`,
        positiveReviews: sql`count(case when ${reviews.isGoodRating} = true then 1 end)::int`,
        negativeReviews: sql`count(case when ${reviews.isGoodRating} = false then 1 end)::int`,
        // NULL (not 0%) when there are no reviews: "no reviews yet" is not "all negative".
        positivePercentage: sql`round((count(case when ${reviews.isGoodRating} = true then 1 end)::numeric / nullif(count(*), 0)::numeric) * 100, 2)`,
      })
      .from(reviews)
      .where(whereClause);

    return stats;
  },

  /**
   * Get a single review by ID
   * @param {number} reviewId - Review ID
   * @returns {Promise<Object|null>} Review object or null
   */
  async getReviewById(reviewId) {
    const [review] = await db
      .select({
        id: reviews.id,
        reviewerId: reviews.reviewerId,
        targetId: reviews.targetId,
        auctionId: reviews.auctionId,
        isGoodRating: reviews.isGoodRating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        // Reviewer info
        reviewerUsername: sql`reviewer.username`,
        reviewerFullName: sql`reviewer.full_name`,
        reviewerAvatarUrl: sql`reviewer.avatar_url`,
        // Target user info
        targetUsername: sql`target_user.username`,
        targetFullName: sql`target_user.full_name`,
        targetAvatarUrl: sql`target_user.avatar_url`,
        // Auction info
        auctionTitle: auctions.title,
        auctionStatus: auctions.status,
      })
      .from(reviews)
      .leftJoin(sql`users as reviewer`, sql`reviewer.user_id = ${reviews.reviewerId}`)
      .leftJoin(sql`users as target_user`, sql`target_user.user_id = ${reviews.targetId}`)
      .leftJoin(auctions, eq(reviews.auctionId, auctions.id))
      .where(eq(reviews.id, reviewId));

    return review || null;
  },
};

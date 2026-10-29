// Legacy review clean-up that must happen BEFORE migration 0005 can add unique/FK/NOT NULL constraints.
// Nothing is deleted: rows that cannot stay are moved to reviews_legacy_archive with the reason. `sql` is postgres-js (client or tx).

export async function planReviewRepair(sql) {
  const duplicates = await sql`
    SELECT auction_id, reviewer_id, array_agg(review_id ORDER BY created_at DESC NULLS LAST, review_id DESC) AS ids
    FROM reviews WHERE auction_id IS NOT NULL AND reviewer_id IS NOT NULL
    GROUP BY auction_id, reviewer_id HAVING count(*) > 1`;
  const invalid = await sql`
    SELECT r.review_id, CASE
        WHEN r.reviewer_id IS NULL OR r.target_user_id IS NULL OR r.auction_id IS NULL THEN 'null_reference'
        WHEN r.reviewer_id = r.target_user_id THEN 'self_review'
        ELSE 'orphan' END AS reason
    FROM reviews r
    WHERE r.reviewer_id IS NULL OR r.target_user_id IS NULL OR r.auction_id IS NULL OR r.reviewer_id = r.target_user_id
       OR NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id = r.reviewer_id)
       OR NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id = r.target_user_id)
       OR NOT EXISTS (SELECT 1 FROM auctions a WHERE a.auction_id = r.auction_id)`;
  const cancellationLike = await sql`
    SELECT r.review_id, r.auction_id FROM reviews r JOIN orders o ON o.auction_id = r.auction_id
    WHERE o.status = 'cancelled' AND o.cancelled_by = r.reviewer_id AND r.is_good_rating = false AND r.target_user_id = o.buyer_id`;
  return {
    duplicateGroups: duplicates.map((d) => ({ auctionId: d.auction_id, reviewerId: d.reviewer_id, keep: d.ids[0], archive: d.ids.slice(1) })),
    invalid: invalid.map((r) => ({ reviewId: r.review_id, reason: r.reason })),
    cancellationLikeFlagged: cancellationLike.length, // informational: kept and counted, tagged by the migration for a human decision
  };
}

export async function applyReviewRepair(sql, plan) {
  const moves = [
    ...plan.duplicateGroups.flatMap((g) => g.archive.map((id) => ({ id, reason: "duplicate_superseded" }))),
    ...plan.invalid.map((r) => ({ id: r.reviewId, reason: r.reason })),
  ];
  await sql.begin(async (tx) => {
    await tx`CREATE TABLE IF NOT EXISTS reviews_legacy_archive (LIKE reviews INCLUDING DEFAULTS, archived_at timestamptz NOT NULL DEFAULT now(), archive_reason text)`;
    const targets = new Set();
    for (const m of moves) {
      const [row] = await tx`SELECT target_user_id FROM reviews WHERE review_id = ${m.id}`;
      if (row?.target_user_id) targets.add(row.target_user_id);
      await tx`INSERT INTO reviews_legacy_archive SELECT r.*, now(), ${m.reason} FROM reviews r WHERE r.review_id = ${m.id}`;
      await tx`DELETE FROM reviews WHERE review_id = ${m.id}`;
    }
    await recomputeRatings(tx, [...targets]);
  });
  return { archived: moves.length };
}

/** Rebuild users.rating_count / positive_rating_count from the review rows (for the given users, or everyone). */
export async function recomputeRatings(sql, userIds = null) {
  await sql`
    UPDATE users u SET
      rating_count = COALESCE(c.total, 0),
      positive_rating_count = COALESCE(c.pos, 0)
    FROM users u2
    LEFT JOIN (SELECT target_user_id AS uid, count(*)::int AS total, count(*) FILTER (WHERE is_good_rating)::int AS pos FROM reviews GROUP BY target_user_id) c ON c.uid = u2.user_id
    WHERE u.user_id = u2.user_id ${userIds ? sql`AND u.user_id = ANY(${userIds})` : sql``}`;
}

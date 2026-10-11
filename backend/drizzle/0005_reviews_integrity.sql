-- Preflight (hand-written): do NOT guess how to merge legacy reviews. Abort with a precise reason; run
--   npm run db:resolve-reviews            (dry run: prints the report)
--   npm run db:resolve-reviews -- --apply (archives duplicates, recomputes rating counters)
-- and then re-run the migration.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM (SELECT 1 FROM reviews WHERE reviewer_id IS NOT NULL AND auction_id IS NOT NULL GROUP BY auction_id, reviewer_id HAVING count(*) > 1) d;
  IF n > 0 THEN RAISE EXCEPTION 'reviews: % duplicate (auction, reviewer) groups; run db:resolve-reviews first', n; END IF;
  SELECT count(*) INTO n FROM reviews WHERE reviewer_id IS NULL OR target_user_id IS NULL OR auction_id IS NULL;
  IF n > 0 THEN RAISE EXCEPTION 'reviews: % rows with NULL reviewer/target/auction; run db:resolve-reviews first', n; END IF;
  SELECT count(*) INTO n FROM reviews r WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id = r.reviewer_id) OR NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id = r.target_user_id) OR NOT EXISTS (SELECT 1 FROM auctions a WHERE a.auction_id = r.auction_id);
  IF n > 0 THEN RAISE EXCEPTION 'reviews: % orphan rows (missing user/auction); run db:resolve-reviews first', n; END IF;
  SELECT count(*) INTO n FROM reviews WHERE reviewer_id = target_user_id;
  IF n > 0 THEN RAISE EXCEPTION 'reviews: % self-reviews; run db:resolve-reviews first', n; END IF;
END $$;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "reviewer_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "target_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "auction_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "source" varchar(24) DEFAULT 'participant' NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_user_id_users_user_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_auction_id_auctions_auction_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("auction_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_auction_reviewer_uniq" ON "reviews" USING btree ("auction_id","reviewer_id");--> statement-breakpoint
CREATE INDEX "reviews_target_idx" ON "reviews" USING btree ("target_user_id");
--> statement-breakpoint
-- Classify reviews that the old cancel flow created automatically (seller cancels -> negative review of the buyer).
-- They stay counted (reputation is not rewritten silently) but are flagged for a human decision.
UPDATE reviews r SET source = 'legacy_cancellation' FROM orders o
  WHERE o.auction_id = r.auction_id AND o.status = 'cancelled' AND o.cancelled_by = r.reviewer_id AND r.is_good_rating = false
    AND r.target_user_id = o.buyer_id AND (r.comment = 'Order cancelled by seller' OR r.comment IS NOT DISTINCT FROM o.cancel_reason);--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_no_self_chk" CHECK ("reviewer_id" <> "target_user_id");

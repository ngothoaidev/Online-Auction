-- Orphan favourites (user or lot no longer exists) can never be shown; drop them so the foreign keys can be added.
DELETE FROM user_favorites f WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id = f.user_id) OR NOT EXISTS (SELECT 1 FROM auctions a WHERE a.auction_id = f.auction_id);--> statement-breakpoint
ALTER TABLE "user_favorites" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_favorites" ALTER COLUMN "auction_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_auction_id_auctions_auction_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("auction_id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"purpose" varchar(16) NOT NULL,
	"storage_key" varchar(64) NOT NULL,
	"mime" varchar(32) NOT NULL,
	"size" integer NOT NULL,
	"access_scope" varchar(24) DEFAULT 'order_participants' NOT NULL,
	"state" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attached_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_users_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_order_id_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_assets_order_idx" ON "media_assets" USING btree ("order_id","owner_id","purpose","state");--> statement-breakpoint
CREATE INDEX "media_assets_pending_idx" ON "media_assets" USING btree ("created_at") WHERE state = 'pending';
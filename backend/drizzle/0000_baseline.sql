CREATE TYPE "public"."auction_status" AS ENUM('active', 'sold', 'ended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'pending_confirmation', 'pending_delivery', 'pending_receipt', 'pending_review', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."seller_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('unauthorized', 'buyer', 'seller', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'banned');--> statement-breakpoint
CREATE TABLE "auction_images" (
	"image_id" serial PRIMARY KEY NOT NULL,
	"auction_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"is_primary" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "auctions" (
	"auction_id" serial PRIMARY KEY NOT NULL,
	"seller_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"starting_price" numeric(15, 0) NOT NULL,
	"current_price" numeric(15, 0) NOT NULL,
	"step_price" numeric(15, 0) DEFAULT '0',
	"buy_now_price" numeric(15, 0),
	"status" "auction_status" DEFAULT 'active',
	"end_time" timestamp with time zone NOT NULL,
	"allow_newbies" boolean DEFAULT true,
	"winner_id" integer,
	"auto_extend" boolean DEFAULT false,
	"bid_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"bid_id" serial PRIMARY KEY NOT NULL,
	"auction_id" integer NOT NULL,
	"bidder_id" integer NOT NULL,
	"amount" numeric(15, 0) NOT NULL,
	"max_amount" numeric(15, 0),
	"bid_time" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"category_id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"parent_id" integer,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"comment_id" serial PRIMARY KEY NOT NULL,
	"auction_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"parent_id" integer,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "description_logs" (
	"log_id" serial PRIMARY KEY NOT NULL,
	"auction_id" integer,
	"content_snapshot" text NOT NULL,
	"edited_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_messages" (
	"message_id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"message" text NOT NULL,
	"image_url" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"order_id" serial PRIMARY KEY NOT NULL,
	"auction_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"seller_id" integer NOT NULL,
	"final_price" numeric(10, 2) NOT NULL,
	"status" "order_status" DEFAULT 'pending_payment',
	"payment_proof_url" text,
	"shipping_address" text,
	"buyer_phone" varchar(20),
	"payment_submitted_at" timestamp,
	"payment_confirmed_at" timestamp,
	"shipping_proof_url" text,
	"tracking_number" varchar(100),
	"shipping_submitted_at" timestamp,
	"receipt_confirmed_at" timestamp,
	"cancelled_at" timestamp,
	"cancelled_by" integer,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "orders_auction_id_unique" UNIQUE("auction_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"review_id" serial PRIMARY KEY NOT NULL,
	"reviewer_id" integer,
	"target_user_id" integer,
	"auction_id" integer,
	"is_good_rating" boolean,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seller_requests" (
	"request_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"reason" text,
	"status" "seller_request_status" DEFAULT 'pending',
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"seller_expiry_date" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"user_id" integer,
	"auction_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_favorites_user_id_auction_id_pk" PRIMARY KEY("user_id","auction_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(100) NOT NULL,
	"encrypted_password" varchar(255) NOT NULL,
	"full_name" text,
	"role" "user_role" DEFAULT 'unauthorized',
	"status" "user_status" DEFAULT 'active',
	"avatar_url" text,
	"birthday" date,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"rating_count" integer DEFAULT 0,
	"positive_rating_count" integer DEFAULT 0,
	"otp" varchar,
	"google_id" varchar,
	"facebook_id" varchar,
	"is_verified" boolean DEFAULT false,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "auction_images" ADD CONSTRAINT "auction_images_auction_id_auctions_auction_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("auction_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_seller_id_users_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_category_id_categories_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("category_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_winner_id_users_user_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_auctions_auction_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("auction_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidder_id_users_user_id_fk" FOREIGN KEY ("bidder_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_auction_id_auctions_auction_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("auction_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("comment_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_order_id_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_sender_id_users_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_auction_id_auctions_auction_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("auction_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_users_user_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelled_by_users_user_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
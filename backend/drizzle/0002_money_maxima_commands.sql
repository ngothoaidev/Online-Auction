CREATE TABLE "auction_command_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"command_id" varchar(100) NOT NULL,
	"auction_id" integer NOT NULL,
	"actor_id" integer,
	"sequence" bigint NOT NULL,
	"kind" varchar(32) NOT NULL,
	"decision" varchar(32) NOT NULL,
	"private_payload" jsonb,
	"version_before" integer,
	"version_after" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bidder_maxima" (
	"auction_id" integer NOT NULL,
	"bidder_id" integer NOT NULL,
	"max_amount" numeric(15, 0) NOT NULL,
	"priority_sequence" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"disqualified_at" timestamp with time zone,
	"disqualified_reason" text,
	CONSTRAINT "bidder_maxima_auction_id_bidder_id_pk" PRIMARY KEY("auction_id","bidder_id")
);
--> statement-breakpoint
CREATE TABLE "command_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer NOT NULL,
	"operation" varchar(100) NOT NULL,
	"idempotency_key" varchar(100) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"http_status" integer,
	"result" jsonb,
	"resource_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_type" varchar(32) NOT NULL,
	"aggregate_id" integer NOT NULL,
	"aggregate_version" integer NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"public_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_until" timestamp with time zone,
	"dispatched_at" timestamp with time zone
);
--> statement-breakpoint
-- Preflight (hand-written): never round money silently. Abort the migration if any legacy order price has a fractional part
-- or does not fit the new numeric(15,0) domain; fix the data (or decide the policy) and re-run.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM orders WHERE final_price <> trunc(final_price)) THEN
    RAISE EXCEPTION 'orders.final_price has fractional values; resolve them before migrating (see docs/baseline.md D3.2)';
  END IF;
  IF EXISTS (SELECT 1 FROM orders WHERE final_price < 0 OR final_price >= 1000000000000000) THEN
    RAISE EXCEPTION 'orders.final_price out of the supported money domain';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "final_price" SET DATA TYPE numeric(15, 0);--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "command_sequence" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "settled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auctions" ADD COLUMN "close_reason" varchar(32);--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "auction_sequence" bigint;--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "type" varchar(16) DEFAULT 'bid' NOT NULL;--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "invalidated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "auction_command_audit" ADD CONSTRAINT "auction_command_audit_auction_id_auctions_auction_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("auction_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bidder_maxima" ADD CONSTRAINT "bidder_maxima_auction_id_auctions_auction_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("auction_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bidder_maxima" ADD CONSTRAINT "bidder_maxima_bidder_id_users_user_id_fk" FOREIGN KEY ("bidder_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auction_command_audit_auction_idx" ON "auction_command_audit" USING btree ("auction_id","sequence");--> statement-breakpoint
CREATE INDEX "bidder_maxima_rank_idx" ON "bidder_maxima" USING btree ("auction_id","max_amount","priority_sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "command_requests_actor_op_key_uniq" ON "command_requests" USING btree ("actor_id","operation","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_events_logical_uniq" ON "outbox_events" USING btree ("aggregate_type","aggregate_id","aggregate_version","event_type");--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("next_attempt_at") WHERE dispatched_at IS NULL;--> statement-breakpoint
CREATE INDEX "auctions_status_end_time_idx" ON "auctions" USING btree ("status","end_time","auction_id");--> statement-breakpoint
CREATE INDEX "bids_auction_sequence_idx" ON "bids" USING btree ("auction_id","auction_sequence");
--> statement-breakpoint
-- Integrity checks. NOT VALID on tables that may hold legacy rows: enforced for every new/updated row, and
-- "ALTER TABLE ... VALIDATE CONSTRAINT" is run after the legacy data audit (docs/runbooks).
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_money_chk" CHECK ("starting_price" > 0 AND "current_price" > 0 AND ("step_price" IS NULL OR "step_price" > 0) AND ("buy_now_price" IS NULL OR "buy_now_price" > "starting_price")) NOT VALID;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_rating_chk" CHECK ("rating_count" >= 0 AND "positive_rating_count" >= 0 AND "positive_rating_count" <= "rating_count") NOT VALID;--> statement-breakpoint
ALTER TABLE "bidder_maxima" ADD CONSTRAINT "bidder_maxima_amount_chk" CHECK ("max_amount" > 0 AND "priority_sequence" >= 0);--> statement-breakpoint
ALTER TABLE "command_requests" ADD CONSTRAINT "command_requests_hash_chk" CHECK (length("request_hash") = 64);

CREATE TABLE "admin_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer NOT NULL,
	"action" varchar(40) NOT NULL,
	"target_type" varchar(24) NOT NULL,
	"target_id" integer NOT NULL,
	"reason" text,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listing_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"auction_id" integer NOT NULL,
	"reporter_id" integer NOT NULL,
	"reason" varchar(24) NOT NULL,
	"details" text,
	"status" varchar(12) DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" integer,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_auction_id_auctions_auction_id_fk" FOREIGN KEY ("auction_id") REFERENCES "public"."auctions"("auction_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_reports" ADD CONSTRAINT "listing_reports_reporter_id_users_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_target_idx" ON "admin_audit" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_time_idx" ON "admin_audit" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_reports_open_uniq" ON "listing_reports" USING btree ("auction_id","reporter_id") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "listing_reports_status_idx" ON "listing_reports" USING btree ("status","created_at");--> statement-breakpoint
-- The audit trail is append-only: corrections are new rows, never edits.
CREATE FUNCTION "admin_audit_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'admin_audit is append-only'; END $$;--> statement-breakpoint
CREATE TRIGGER "admin_audit_no_change" BEFORE UPDATE OR DELETE ON "admin_audit" FOR EACH ROW EXECUTE FUNCTION "admin_audit_append_only"();

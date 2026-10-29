CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" integer NOT NULL,
	"channel" varchar(8) NOT NULL,
	"kind" varchar(32) NOT NULL,
	"dedupe_key" varchar(160) NOT NULL,
	"title" varchar(300) NOT NULL,
	"body" text NOT NULL,
	"link" varchar(200),
	"status" varchar(12) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_logical_uniq" ON "notifications" USING btree ("recipient_id","channel","dedupe_key");--> statement-breakpoint
CREATE INDEX "notifications_inbox_idx" ON "notifications" USING btree ("recipient_id","channel","created_at");--> statement-breakpoint
CREATE INDEX "notifications_delivery_idx" ON "notifications" USING btree ("status","created_at") WHERE channel = 'email';
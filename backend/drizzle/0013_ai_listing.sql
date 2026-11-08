CREATE TABLE "ai_beta_budget" (
	"id" integer PRIMARY KEY NOT NULL,
	"limit_cents" integer NOT NULL,
	"reserved_cents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_daily_quota" (
	"user_id" integer NOT NULL,
	"day" date NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ai_daily_quota_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "ai_draft_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"idempotency_key" varchar(100) NOT NULL,
	"input_hash" varchar(64) NOT NULL,
	"status" varchar(20) NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"result" jsonb,
	"usage" jsonb,
	"error_code" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"lease_until" timestamp with time zone NOT NULL,
	"applied" boolean DEFAULT false NOT NULL,
	"undone" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_daily_quota" ADD CONSTRAINT "ai_daily_quota_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_draft_requests" ADD CONSTRAINT "ai_draft_requests_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_draft_owner_key" ON "ai_draft_requests" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "ai_draft_active" ON "ai_draft_requests" USING btree ("status","lease_until");
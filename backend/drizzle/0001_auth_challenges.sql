CREATE TABLE "auth_challenges" (
	"challenge_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"hashed_code" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_challenges_user_purpose_idx" ON "auth_challenges" USING btree ("user_id","purpose");
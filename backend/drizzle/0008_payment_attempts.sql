CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"provider" varchar(16) NOT NULL,
	"reference" varchar(64) NOT NULL,
	"amount" numeric(15, 0) NOT NULL,
	"currency" varchar(3) DEFAULT 'VND' NOT NULL,
	"status" varchar(16) DEFAULT 'created' NOT NULL,
	"provider_status" varchar(16) DEFAULT 'pending' NOT NULL,
	"exception_reason" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(16) NOT NULL,
	"event_id" varchar(100) NOT NULL,
	"reference" varchar(64) NOT NULL,
	"type" varchar(32) NOT NULL,
	"amount" numeric(15, 0),
	"currency" varchar(3),
	"outcome" varchar(64),
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_order_id_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_buyer_id_users_user_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_reference_uniq" ON "payment_attempts" USING btree ("provider","reference");--> statement-breakpoint
CREATE INDEX "payment_attempts_order_idx" ON "payment_attempts" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_attempts_open_idx" ON "payment_attempts" USING btree ("updated_at") WHERE status = 'created';--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_event_uniq" ON "payment_events" USING btree ("provider","event_id");
ALTER TYPE "public"."order_status" ADD VALUE 'payment_expired';--> statement-breakpoint
CREATE TABLE "order_transitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"from_status" varchar(32) NOT NULL,
	"to_status" varchar(32) NOT NULL,
	"command" varchar(32) NOT NULL,
	"actor_type" varchar(16) NOT NULL,
	"actor_id" integer,
	"reason" text,
	"command_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_mode" varchar(16) DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "close_reason" varchar(32);--> statement-breakpoint
ALTER TABLE "order_transitions" ADD CONSTRAINT "order_transitions_order_id_orders_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("order_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_transitions_order_idx" ON "order_transitions" USING btree ("order_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_transitions_command_uniq" ON "order_transitions" USING btree ("order_id","command_id") WHERE command_id IS NOT NULL;--> statement-breakpoint
-- Legacy orders still waiting for payment get a fresh 48h window from the moment of migration (no instant mass-expiry at cutover).
UPDATE "orders" SET "payment_due_at" = now() + interval '48 hours' WHERE "status" = 'pending_payment' AND "payment_due_at" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_price_chk" CHECK ("final_price" > 0) NOT VALID;

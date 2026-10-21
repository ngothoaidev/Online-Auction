DROP INDEX "outbox_events_pending_idx";--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "private_payload" jsonb;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "dead_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD COLUMN "last_error" text;--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("next_attempt_at") WHERE dispatched_at IS NULL AND dead_at IS NULL;
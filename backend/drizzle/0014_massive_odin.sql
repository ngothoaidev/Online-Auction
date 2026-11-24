ALTER TABLE "ai_draft_requests" ADD COLUMN "provider" text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_draft_requests" ADD COLUMN "budget_id" integer DEFAULT 1 NOT NULL;
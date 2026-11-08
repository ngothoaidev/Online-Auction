ALTER TABLE "payment_attempts" ALTER COLUMN "reference" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "payment_events" ALTER COLUMN "reference" SET DATA TYPE varchar(255);
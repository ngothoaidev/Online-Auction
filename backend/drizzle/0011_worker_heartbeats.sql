CREATE TABLE "worker_heartbeats" (
	"worker_id" varchar(100) PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_beat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_pass_ms" integer,
	"last_pass_failures" integer DEFAULT 0 NOT NULL
);

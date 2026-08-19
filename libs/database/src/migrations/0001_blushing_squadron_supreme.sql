CREATE TABLE IF NOT EXISTS "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"scanned_sources" integer DEFAULT 0 NOT NULL,
	"new_chapters" integer DEFAULT 0 NOT NULL,
	"updated_manhwa" integer DEFAULT 0 NOT NULL,
	"skipped_telegram" integer DEFAULT 0 NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"run_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manhwa" ADD COLUMN "deleted_at" timestamp;
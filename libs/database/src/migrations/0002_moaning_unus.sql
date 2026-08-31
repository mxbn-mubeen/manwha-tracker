ALTER TABLE "sources" ADD COLUMN "last_synced_chapter" real;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "last_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD COLUMN "triggered_by" varchar(50) DEFAULT 'manual' NOT NULL;
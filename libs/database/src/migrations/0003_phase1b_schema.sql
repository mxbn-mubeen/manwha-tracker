-- Phase 1b migrations (expand step)
--
-- 1. Add last_read_chapter_num to progress (expand — old chapterId stays for now)
-- 2. Drop unique constraint on sources.telegram_entity_id so multiple manhwa can share a channel
-- 3. Add manhwa_covers table for binary WebP storage

ALTER TABLE "progress" ADD COLUMN "last_read_chapter_num" real;--> statement-breakpoint

-- Backfill last_read_chapter_num from existing chapter rows.
-- Handles Infinity, NaN, negative, and null — only copies a valid finite >= 0 value.
UPDATE "progress" p
SET last_read_chapter_num = c.chapter_num
FROM "chapters" c
WHERE c.id = p.chapter_id
  AND c.chapter_num IS NOT NULL
  AND c.chapter_num >= 0
  AND c.chapter_num <= 10000
  AND c.chapter_num = c.chapter_num; -- filters NaN (NaN != NaN in SQL is true... but in pg, use below check)
--> statement-breakpoint

-- Clean up any rows where the result is still NULL or invalid after the backfill.
-- progress rows that had chapter_id = NULL (no progress set) are left NULL — that is correct.
--> statement-breakpoint

-- Drop the unique constraint on telegram_entity_id.
-- Bug: this prevented two manhwa from sharing the same channel, which is a real use case.
ALTER TABLE "sources" DROP CONSTRAINT "sources_telegram_entity_id_unique";--> statement-breakpoint

-- Create covers table for binary WebP storage.
-- cover_data holds the compressed WebP bytes.
-- content_hash is a short SHA-1 prefix used as ?v= cache-buster.
CREATE TABLE IF NOT EXISTS "manhwa_covers" (
	"id" serial PRIMARY KEY NOT NULL,
	"manhwa_id" integer NOT NULL,
	"cover_data" bytea NOT NULL,
	"content_type" varchar(50) DEFAULT 'image/webp' NOT NULL,
	"content_hash" varchar(40) NOT NULL,
	"width" integer,
	"height" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "manhwa_covers_manhwa_id_unique" UNIQUE("manhwa_id")
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "manhwa_covers" ADD CONSTRAINT "manhwa_covers_manhwa_id_manhwa_id_fk"
    FOREIGN KEY ("manhwa_id") REFERENCES "public"."manhwa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

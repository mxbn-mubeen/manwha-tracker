CREATE TABLE IF NOT EXISTS "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"manhwa_id" integer NOT NULL,
	"source_id" integer,
	"chapter_num" real NOT NULL,
	"title" text,
	"url" text,
	"published_at" timestamp,
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chapters_manhwa_id_chapter_num_unique" UNIQUE("manhwa_id","chapter_num")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manhwa" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"cover_url" text,
	"status" varchar(20) DEFAULT 'ongoing' NOT NULL,
	"genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "manhwa_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"manhwa_id" integer NOT NULL,
	"chapter_id" integer,
	"last_read_at" timestamp DEFAULT now() NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "progress_manhwa_id_unique" UNIQUE("manhwa_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"manhwa_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"url" text NOT NULL,
	"adapter_key" varchar(50) NOT NULL,
	"priority" integer DEFAULT 10 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"telegram_entity_id" text,
	"telegram_access_hash" text,
	"telegram_entity_type" varchar(20),
	CONSTRAINT "sources_telegram_entity_id_unique" UNIQUE("telegram_entity_id"),
	CONSTRAINT "sources_manhwa_id_url_unique" UNIQUE("manhwa_id","url")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chapters" ADD CONSTRAINT "chapters_manhwa_id_manhwa_id_fk" FOREIGN KEY ("manhwa_id") REFERENCES "public"."manhwa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chapters" ADD CONSTRAINT "chapters_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "progress" ADD CONSTRAINT "progress_manhwa_id_manhwa_id_fk" FOREIGN KEY ("manhwa_id") REFERENCES "public"."manhwa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "progress" ADD CONSTRAINT "progress_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sources" ADD CONSTRAINT "sources_manhwa_id_manhwa_id_fk" FOREIGN KEY ("manhwa_id") REFERENCES "public"."manhwa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

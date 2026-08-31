import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  real,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';

// ── manhwa ────────────────────────────────────────────────────────────────────
export const manhwa = pgTable('manhwa', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: text('title').notNull(),
  coverUrl: text('cover_url'),
  status: varchar('status', { length: 20 }).notNull().default('ongoing'),
  genres: jsonb('genres').$type<string[]>().notNull().default([]),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// ── sources ───────────────────────────────────────────────────────────────────
export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  manhwaId: integer('manhwa_id').notNull().references(() => manhwa.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // 'telegram' | 'website'
  url: text('url').notNull(),
  adapterKey: varchar('adapter_key', { length: 50 }).notNull(),
  priority: integer('priority').notNull().default(10),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  // Telegram entity cache — avoids re-calling contacts.ResolveUsername (tightly
  // flood-limited) on every watcher restart / remap cycle. Populated once on
  // first successful resolution, then reused via getInputEntity() forever.
  // Stored as text: GramJS ids/access hashes are int64 (bigint), too large
  // to round-trip safely through the pg `integer` type.
  telegramEntityId: text('telegram_entity_id').unique(),
  telegramAccessHash: text('telegram_access_hash'),
  telegramEntityType: varchar('telegram_entity_type', { length: 20 }),
  
  // Tracks the max chapter this source has reported, even if another source found it first
  lastSyncedChapter: real('last_synced_chapter'),
  lastSyncedAt: timestamp('last_synced_at'),
}, (table) => ({
  manhwaUrlUnique: unique().on(table.manhwaId, table.url),
}));

// ── chapters ──────────────────────────────────────────────────────────────────
export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  manhwaId: integer('manhwa_id').notNull().references(() => manhwa.id, { onDelete: 'cascade' }),
  sourceId: integer('source_id').references(() => sources.id, { onDelete: 'set null' }),
  chapterNum: real('chapter_num').notNull(), // real supports decimal chapters like 12.5
  title: text('title'),
  url: text('url'),
  publishedAt: timestamp('published_at'),
  discoveredAt: timestamp('discovered_at').notNull().defaultNow(),
}, (t) => ({
  unq: unique().on(t.manhwaId, t.chapterNum),
}));

// ── progress ──────────────────────────────────────────────────────────────────
// Single row per manhwa — single user, no user_id
export const progress = pgTable('progress', {
  id: serial('id').primaryKey(),
  manhwaId: integer('manhwa_id').notNull().references(() => manhwa.id, { onDelete: 'cascade' }).unique(),
  chapterId: integer('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
  lastReadAt: timestamp('last_read_at').notNull().defaultNow(),
  isCompleted: boolean('is_completed').notNull().default(false),
});

// ── settings ──────────────────────────────────────────────────────────────────
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── sync history ──────────────────────────────────────────────────────────────
export const syncRuns = pgTable('sync_runs', {
  id: serial('id').primaryKey(),
  scannedSources: integer('scanned_sources').notNull().default(0),
  newChapters: integer('new_chapters').notNull().default(0),
  updatedManhwa: integer('updated_manhwa').notNull().default(0),
  skippedTelegram: integer('skipped_telegram').notNull().default(0),
  errors: jsonb('errors').$type<string[]>().notNull().default([]),
  rows: jsonb('rows').$type<any[]>().notNull().default([]),
  duration: integer('duration').notNull().default(0),
  triggeredBy: varchar('triggered_by', { length: 50 }).notNull().default('manual'), // 'manual' | 'cron'
  runAt: timestamp('run_at').notNull().defaultNow(),
});

// ── type exports ──────────────────────────────────────────────────────────────
export type Manhwa = typeof manhwa.$inferSelect;
export type InsertManhwa = typeof manhwa.$inferInsert;

export type Source = typeof sources.$inferSelect;
export type InsertSource = typeof sources.$inferInsert;

export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = typeof chapters.$inferInsert;

export type Progress = typeof progress.$inferSelect;
export type InsertProgress = typeof progress.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

export type SyncRunRow = typeof syncRuns.$inferSelect;
export type InsertSyncRunRow = typeof syncRuns.$inferInsert;

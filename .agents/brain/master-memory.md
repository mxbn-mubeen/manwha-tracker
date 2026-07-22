# Manhwa Tracker — Master Memory

project_root: D:\manwha-tracker
last_brain_review: 2026-07-22

## What This Project Does

A personal, single-user Manhwa/Manga reading tracker. Monitors manhwa chapter releases from:
- Multiple manhwa websites (via scrapers/adapters)
- Telegram channels (via GramJS MTProto personal account) — Phase 3

Automatically tracks reading progress. When user downloads the latest chapter from Telegram, that chapter is auto-marked as "Last Read." No auth system — purely personal use.

## Key Features

- Unified library of tracked manhwa titles
- Reading progress tracking (last read chapter per title)
- Dashboard: stats (total, reading, completed), recently updated
- Library: cover grid, search, add manhwa from URL
- Website adapters for: AsuraScans, Webtoon, ReaperScans, manhuaus.com (+ generic)
- Telegram channel monitoring → auto-detects new chapters → download = last read (Phase 3)

## Current State (as of 2026-07-22)

- **Architecture fully migrated from Next.js to Vite + Express** (Option 2 — decoupled)
- Express tRPC API (`apps/api`) running on port 3001 ✅
- Vite React frontend (`apps/web`) running on port 3000 ✅
- Neon PostgreSQL connected via `@manhwa-tracker/database` lib ✅
- `packages/` renamed to `libs/` for clarity ✅
- UI rebuilt with Tailwind v4 + shadcn/ui dark manhwa theme ✅
- Dashboard, Library, AddManhwa, ManhwaDetail, Settings pages all working ✅
- **Web src reorganized from `pages/` to `features/`** (feature-based folder structure) ✅
- **ManhwaDetail refactored** into sub-components: ManhwaHeader, ManhwaPoster, ProgressCard, SourcesList, EditManhwaModal ✅
- **ManhwaHeader now shows ID badge** (`ID #42`) below the title ✅
- **214 manhwa imported** from enriched CSV into DB ✅
- **Telegram watcher live and running** (`telegram-download-watcher.ts`) — event-driven, catches new chapters + read progress ✅

### DB Driver Constraints (CRITICAL)
- Driver: `drizzle-orm/neon-http` — **Neon HTTP serverless**
- ❌ `db.query.*` relational API is NOT supported (throws `referencedTable` or hangs silently)
- ❌ `db.transaction()` is NOT supported (throws `No transactions support in neon-http driver`)
- ✅ Use only `db.select().from()`, `db.insert()`, `db.update()`, `db.delete()` with plain joins
- ✅ Use `insert(...).onConflictDoUpdate()` for upserts instead of read-then-update

### tRPC API Endpoints (manhwaRouter)
| Endpoint | Type | Description |
|---|---|---|
| `getAll` | query | All manhwa with progress, latest chapter, sources |
| `getById` | query | Single manhwa with full detail |
| `create` | mutation | Manually create manhwa (title, status, chapters, cover…) |
| `addFromUrl` | mutation | Scrape + create from website URL |
| `updateProgress` | mutation | Update last read chapter (upserts progress row) |
| `updateStatus` | mutation | Change status (ongoing/hiatus/completed/dropped) |
| `addSource` | mutation | Add Telegram/website source to existing manhwa |
| `delete` | mutation | Remove manhwa from library |

### Phase 3 Scripts (in `apps/api/src/scripts/`)
- `backfill-covers.ts` — backfills cover URLs for manhwa missing them via MangaDex/scraping ✅
- `cron-sync.ts` — runs the website sync loop ✅
- `telegram-download-watcher.ts` — watches Telegram channels, event-driven (NewMessage + ReadInbox) ✅
- `fix-db.ts` — emergency cleanup script for corrupted chapters ✅
- `telegram-login.ts` — handles MTProto authentication ✅

⚠️ Scripts that DO NOT EXIST (stale references in package.json): `telegram-scan.ts`, `telegram-import.ts`, `telegram-import-from-csv.ts`, `import-from-enriched-csv.ts`, `fix-progress.ts`

## Active Work

- Telegram watcher is live and functioning correctly (event-driven, tested in production).
- Website adapter sync implemented but not yet verified against all live sites (asurascans chapter extraction tested with synthetic HTML only).
- Settings page added but may be minimal/stub.
- Missing scripts (telegram-scan, telegram-import, etc.) referenced in package.json — these need to be re-written if ever needed.

## Tech Stack

- **Frontend**: Vite 5 + React 19 + react-router-dom 6 (port 3000)
- **Backend**: Express 4 + tRPC v11 + settings + sync routers (port 3001)
- TypeScript 5
- shadcn/ui components (Button, Card, Badge, Input, toast via Sonner)
- TanStack Query v5 (via tRPC React hooks)
- Drizzle ORM + Neon PostgreSQL serverless (`drizzle-orm/neon-http` driver)
- Zod (tRPC input validation)
- Superjson (tRPC transformer — must be on `createClient`, NOT inside `httpBatchLink`)
- PNPM Workspaces + TurboRepo
- GramJS (Telegram MTProto — telegram-download-watcher.ts)
- Cheerio (HTML scraping — in `libs/parser`)

## Personal Info / Credentials

- Telegram: Personal MTProto account (API_ID + API_HASH + PHONE already configured in D:\telbot\.env)
- Database: Neon PostgreSQL — URL in `D:\manwha-tracker\.env` and `apps/api/.env`
- Single user — no auth system, no user_id in schema

## Env Setup

- Root `.env` — shared (DATABASE_URL + Telegram API_ID/API_HASH/PHONE/SESSION)
- `apps/api/src/env.ts` — loads root `.env` explicitly via `dotenv.config({ path: resolve(__dirname, '../../../.env') })`
- `apps/api/.env` — copy of root `.env` (kept as fallback)
- Frontend uses `VITE_API_URL` env var (defaults to `http://localhost:3001`)

## Roadmap Phases

- Phase 1: Monorepo scaffold, DB schema, Dashboard, Library, Reading Progress ✅
- Phase 2: Architecture migration (Next.js → Vite + Express) ✅
- Phase 3: Telegram sync, Website adapters expanded, Render & Vercel deployment

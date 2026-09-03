# Manhwa Tracker — Master Memory

project_root: F:\manwha-tracker
last_brain_review: 2026-08-31

## What This Project Does

A personal, single-user Manhwa/Manga reading tracker. Monitors manhwa chapter releases from:
- Multiple manhwa websites (via scrapers/adapters)
- Telegram channels (via `teleproto` MTProto personal account)

Automatically tracks reading progress. When user downloads the latest chapter from Telegram, that chapter is auto-marked as "Last Read." No auth system — purely personal use.

## Key Features

- Unified library of tracked manhwa titles
- Reading progress tracking (last read chapter per title)
- Dashboard: stats (total, reading, completed), Continue Reading, Recent Activity
- Library: cover grid, search, status filters, add manhwa from URL
- **Unified Sources page** (`/sources`): manage all website + Telegram sources in one place.
  - Two tabs (Websites / Telegram)
  - Domain filter chips — one chip per unique hostname in DB, coloured by adapter
  - Adapter badges — colour-coded per adapter (orange=asurascans, red=reaperscans, violet=thunderscans, etc.)
  - Inline URL editing (SourceRow desktop / SourceCard mobile)
  - Mobile card layout below `md` breakpoint
  - **Fix Adapters button** — calls `manhwa.redetectAdapterKeys`, re-runs `detectAdapterKey(url)` on every website source row and writes correct key back
- Website adapters for: AsuraScans (asurascans.com/asuracomic.net/asurascan.com), Webtoon, Reaper Scans, manhuaus.com, Arena Scans, Comix.to, Mgeko, RoliaScan, Thunder Scans, Infinite Level Up, Ultimate of All Ages (+ generic fallback) — 11 real site adapters total
- Telegram channel monitoring → auto-detects new chapters → download/read = last read
- Telegram alert bot (`/create`, `/latest`, `/read`, forward-to-register) for manhwa/progress management without the web UI
- Soft delete (delete/recover/getDeleted) for manhwa
- Sync history (`sync_runs` table) with per-row status (new/no_new/issue/failed) shown in a Settings drawer

## Current State (as of 2026-08-31)

- **Architecture fully migrated from Next.js to Vite + Express** (Option 2 — decoupled)
- **`apps/api` split further into `apps/api` (fast queries, Vercel Serverless) + `apps/worker`
  (long-running: Telegram watcher, Telegram bot, website sync)**
- Vite React frontend (apps/web) running on port 3000 OK
- Neon PostgreSQL connected via @manhwa-tracker/database lib OK
- UI rebuilt with Tailwind v4 + shadcn/ui dark manhwa theme OK
- Dashboard, Library, AddManhwa, ManhwaDetail, Settings pages all working OK
- Web src organized as features/ (feature-based folder structure) OK
- ManhwaDetail refactored into sub-components: ManhwaHeader, ManhwaPoster, ProgressCard, SourcesList, EditManhwaModal OK
- Telegram watcher live and running — event-driven + reconciliation + health-check rebuild + activity watchdog + scheduled rebuild OK
- manhwa.repository.ts split into manhwa.repository.ts (writes) + manhwa.read.repository.ts (reads) OK
- Per-source chapter status in SourcesList: Leading/Synced/Behind badge and Last discovered X ago OK
- Library Unread filter added (shows manhwa where latestChapter > lastChapter) OK
- Completed manhwa filtering added: Dashboard Continue Reading and Library Unread hide `status='completed'` titles OK
- **Cloudflare fallback chain**: `http.ts` now tries FlareSolverr → Playwright headless browser → fails; the `looksLikeCloudflareChallenge` check gates both layers OK
- **Codebase-wide 230-line refactor** complete (2026-08-31) — all files now under 230 lines OK
  (see Active Work for the full list of extracted files)

### Deployment Architecture (as of 2026-08-28)

**Hybrid split: Vercel (fast API + frontend) + Render (background worker)**

| Service | Host | What it does |
|---|---|---|
| Frontend + Fast tRPC API | Vercel | Serves UI, handles all fast DB queries via Serverless Functions |
| Background Worker (`apps/worker`) | Render (Docker) | Runs Telegram watcher, Telegram bot, and handles `sync.run` long-running jobs |
| FlareSolverr | Render (Docker, sleeps) | Browser rendering for protected manga sites — wakes on demand during sync |
| Database | Neon PostgreSQL | Shared between Vercel and Render |

**Key env vars:**
- Vercel: `DATABASE_URL`, `APP_SECRET`, `VITE_APP_SECRET`, `VITE_API_URL`, `VITE_SYNC_URL` (Render worker URL)
- Render: `DATABASE_URL`, `APP_SECRET`, `FRONTEND_URL` (Vercel URL), `FLARESOLVERR_URL`, all Telegram vars

**tRPC routing (frontend `providers.tsx`, via `splitLink`):**
- `sync.run` → `VITE_SYNC_URL/trpc` (worker)
- Everything else → `VITE_API_URL/trpc` (Vercel Serverless Function)
- Both env vars default to `http://localhost:3001` for local dev — there is no host auto-detection;
  the frontend always reads these two env vars explicitly.

**Local dev:** Run `pnpm dev` from monorepo root. Frontend on :3000, API on :3001, worker on :3002. Kill ports first with `npx kill-port 3000 3001 3002` if ports are in use.

### DB Driver Constraints (CRITICAL)
- Driver: `drizzle-orm/neon-http` — **Neon HTTP serverless**
- ❌ `db.query.*` relational API is NOT supported (throws `referencedTable` or hangs silently)
- ❌ `db.transaction()` is NOT supported (throws `No transactions support in neon-http driver`)
- ✅ Use only `db.select().from()`, `db.insert()`, `db.update()`, `db.delete()` with plain joins
- ✅ Use `insert(...).onConflictDoUpdate()` for upserts instead of read-then-update

### tRPC API Endpoints (manhwaRouter, apps/api)
| Endpoint | Type | Description |
|---|---|---|
| `getAll` | query | All manhwa with progress, global latest chapter, first source |
| `getById` | query | Single manhwa with full sources + per-source `latestChapterNum` + `lastDiscoveredAt` |
| `create` | mutation | Manually create manhwa (title, status, chapters, cover…) |
| `addFromUrl` | mutation | Scrape + create from website URL |
| `update` | mutation | Edit manhwa metadata (title, cover, description, genres) |
| `updateProgress` | mutation | Update last read chapter (upserts progress row) |
| `updateStatus` | mutation | Change status (ongoing/hiatus/completed/dropped) |
| `updateLatestChapter` | mutation | Manually bump latest chapter (inserts chapter row if needed) |
| `addSource` | mutation | Add Telegram/website source to existing manhwa |
| `removeSource` | mutation | Remove a source from manhwa |
| `getAllSources` | query | All sources with manhwa title, type, url, adapterKey (for /sources page) |
| `updateSourceUrl` | mutation | Update a source URL; re-detects adapterKey from new URL |
| `redetectAdapterKeys` | mutation | Re-runs detectAdapterKey() on all website sources; fixes stale 'website' keys |
| `delete` / `recover` / `getDeleted` | mutation/mutation/query | Soft-delete manhwa, undo it, and list soft-deleted manhwa |
| `getTelegramCount` | query | Count of active Telegram sources |
| `getChapters` / `deleteChapter` | query/mutation | List and remove discovered chapters for a manhwa |

`syncRouter.run` on `apps/api` is a stub that throws `NOT_IMPLEMENTED` — the frontend's splitLink
routes the real call to the worker's `POST /trpc/sync.run` instead (see Deployment Architecture above).

### Worker Scripts (in `apps/worker/src/scripts/`)
- `bot/` — Telegram Alert Bot Service (handles alerts and private channel registration via forwards) ✅
- `watcher/` — Telegram Download Watcher (teleproto event-driven: new-message + read-update handlers,
  plus periodic reconciliation as the catch-up mechanism — teleproto's installed version has no
  `catchUp` constructor option, unlike GramJS) ✅
- `cron/cron-sync.ts` — runs the website sync loop once and exits, invoked by
  `.github/workflows/sync-cron.yml` on a 30-minute schedule ✅

⚠️ These scripts do NOT exist, despite older brain notes claiming otherwise: `backfill-covers.ts`,
`fix-bot-entity-ids.ts`, `fix-db.ts`, `telegram-login.ts`, `telegram-scan.ts`, `telegram-import.ts`,
`telegram-import-from-csv.ts`, `import-from-enriched-csv.ts`, `fix-progress.ts`. If any of this
functionality is needed, it has to be written from scratch.

## Active Work

- Telegram watcher is live and functioning correctly (event-driven + reconciliation, tested in production).
- Website adapter sync covers 11 real sites now — several need browser rendering via Playwright/FlareSolverr chain.
- Settings page includes Telegram login/status, sync history, and recently-deleted sections.
- **Unified Sources page** built at `/sources` (2026-08-29).
- **230-line refactor complete (2026-08-31)** — files extracted:
  - `watcher/intervals.ts` — health check, watchdog, reconcile, scheduled rebuild intervals
  - `bot/channel-registration.ts` — multi-step channel add flow + conflict resolution
  - `sync/sync.website.ts` — FlareSolverr wake-up + per-source scraping loop + helpers
  - `ManageChaptersSection.tsx` — expandable chapters list from EditManhwaModal
  - `TelegramLoginWizard.tsx` — phone/OTP/2FA step UI from TelegramSection
  - `SourceStatusBadge.tsx` — StatusBadge + timeAgo/computeStatus/formatDuration helpers
  - `telegram-auth.procedures.ts` — SendCode/SignIn/2FA/status/disconnect from settings.router
- **Cloudflare fallback chain** (2026-08-31): `libs/parser/src/adapters/http.ts` now tries:
  1. Direct HTTP fetch
  2. FlareSolverr (if `FLARESOLVERR_URL` set)
  3. Playwright headless browser (`browser.ts`)
  Gated by `looksLikeCloudflareChallenge()`. Playwright timeout (30s) maps to a user-friendly error.
  FlareSolverr transient errors (429/502) now fast-fail to prevent 60s timeouts on Render.
- **Completed manhwa filtering** (2026-08-31): Dashboard Continue Reading and sources.repository.ts
  `getActiveSources` both exclude `status = 'completed'` manhwa.
- **Sync concurrency reduced to 1** (2026-09-03) because FlareSolverr OOMs on Render free tier when handling multiple Chromium tabs simultaneously.

## Tech Stack

- **Frontend**: Vite 5 + React 19 + react-router-dom 6 (port 3000)
- **API**: Express 4 + tRPC v11 — fast queries only, `apps/api` (port 3001, Vercel Serverless in prod)
- **Worker**: Express 4 — long-running jobs, `apps/worker` (port 3002, Docker/Render in prod)
- TypeScript 5
- shadcn/ui components (Button, Card, Badge, Input, toast via Sonner)
- TanStack Query v5 (via tRPC React hooks)
- Drizzle ORM + Neon PostgreSQL serverless (`drizzle-orm/neon-http` driver)
- Zod (tRPC input validation)
- Superjson (tRPC transformer — must be on `createClient`, NOT inside `httpBatchLink`)
- PNPM Workspaces + TurboRepo
- `teleproto` (Telegram MTProto — NOT GramJS; used by the worker's watcher and by `apps/api`'s
  in-app Telegram login flow)
- Cheerio + got-scraping + playwright-core (HTML scraping / browser rendering — in `libs/parser`)

## Personal Info / Credentials

- Telegram: Personal MTProto account (API_ID + API_HASH + PHONE already configured in root `.env`)
- Database: Neon PostgreSQL — URL in root `.env`
- Single user — no auth system, no user_id in schema

## Env Setup

- Root `.env` — Authoritative shared file (DATABASE_URL + Telegram API_ID/API_HASH/PHONE/SESSION)
- `apps/api/src/env.ts` and `apps/worker/src/env.ts` — each loads root `.env` explicitly via
  `dotenv.config({ path: resolve(__dirname, '../../../.env') })`
- Frontend reads `VITE_API_URL` and `VITE_SYNC_URL` explicitly (both default to
  `http://localhost:3001` locally) — there is no host-based auto-detection, despite what an earlier
  version of this file claimed.
- `VITE_SYNC_URL` — points to the worker's URL (Render in prod) for `sync.run` mutations specifically.

## Roadmap Phases

- Phase 1: Monorepo scaffold, DB schema, Dashboard, Library, Reading Progress ✅
- Phase 2: Architecture migration (Next.js → Vite + Express) ✅
- Phase 3: Telegram sync, Website adapters expanded, Render & Vercel deployment ✅
- Phase 4: Split `apps/api` into `apps/api` (fast) + `apps/worker` (long-running) ✅

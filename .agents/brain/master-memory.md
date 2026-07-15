# Manhwa Tracker — Master Memory

project_root: D:\manwha-tracker
last_brain_review: 2026-07-15

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
- Chrome Extension (MV3) — future phase

## Current State (as of 2026-07-15)

- **Architecture fully migrated from Next.js to Vite + Express** (Option 2 — decoupled)
- Express tRPC API (`apps/api`) running on port 3001 ✅
- Vite React frontend (`apps/web`) running on port 3000 ✅
- Neon PostgreSQL connected via `@manhwa-tracker/database` lib ✅
- `packages/` renamed to `libs/` for clarity ✅
- UI rebuilt with Tailwind v4 + shadcn/ui dark manhwa theme ✅
- Dashboard, Library, Add Manhwa, Manhwa Detail pages implemented ✅
- Phase 3 Telegram scripts created:
  - `telegram-scan.ts` — scans all Telegram channels → CSV ✅
  - `telegram-import.ts` — imports from Telegram live ✅
  - `telegram-import-from-csv.ts` — imports from scan CSV ✅
  - `import-from-enriched-csv.ts` — imports from `manhwa-only.enriched.csv` ✅
- `manhwa-only.enriched.csv` (219 rows) curated with Telegram links + latest chapters ✅

## Active Work

- Running `import:enriched` to populate DB from the enriched CSV
- After DB is populated: verify Library UI shows all titles

## Tech Stack

- **Frontend**: Vite 5 + React 19 + react-router-dom 6 (port 3000)
- **Backend**: Express 4 + tRPC v11 (port 3001)
- TypeScript 5
- Chakra UI v3 (`@chakra-ui/react` v3 — namespace syntax: `Card.Root`, `Dialog.Root`, `Stat.Root`)
- TanStack Query v5
- Zustand v4
- Drizzle ORM + Neon PostgreSQL serverless
- Zod
- Superjson (tRPC transformer — must be on `createClient`, NOT inside `httpBatchLink`)
- PNPM Workspaces + TurboRepo
- GramJS (Phase 3 — Telegram MTProto)
- Cheerio (HTML scraping — in `libs/parser`)

## Personal Info / Credentials

- Telegram: Personal MTProto account (API_ID + API_HASH + PHONE already configured in D:\telbot\.env)
- Database: Neon PostgreSQL — URL in `D:\manwha-tracker\.env` and `apps/api/.env`
- Single user — no auth system, no user_id in schema

## Env Setup

- Root `.env` — shared
- `apps/api/.env` — copy of root `.env` (needed for DATABASE_URL at runtime)
- Frontend uses `VITE_API_URL` env var (defaults to `http://localhost:3001`)

## Roadmap Phases

- Phase 1: Monorepo scaffold, DB schema, Dashboard, Library, Reading Progress ✅
- Phase 2: Architecture migration (Next.js → Vite + Express) ✅
- Phase 3: Telegram sync, Website adapters expanded, GitHub Actions worker
- Phase 4: Chrome Extension, Notification system, OCI migration, PWA

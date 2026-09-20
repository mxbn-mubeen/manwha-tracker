# Manhwa Tracker

A personal, single-user Manhwa/Manga reading tracker. Automatically monitors chapter releases from Telegram channels and websites and tracks reading progress hands-free.

## Features

| | Feature |
|--|---------|
| 📚 | **Unified library** — 200+ manhwa titles in one place |
| 📖 | **Auto reading progress** — open a chapter in Telegram → last-read chapter updates automatically |
| 🔔 | **Real-time chapter detection** — Telegram watcher detects new chapter posts as they're posted |
| 🌐 | **Website sync** — scrapes AsuraScans, Reaper Scans, Webtoon, manhuaus, Arena Scans, Comix.to, Mgeko, Thunder Scans, and more |
| 🛡️ | **Cloudflare bypass** — FlareSolverr → Playwright fallback chain; protected sites are retried automatically |
| 🔍 | **Global search** — fuzzy search with tokenization and ranked scoring across all UI components |
| 🔗 | **Sources page** — manage every website and Telegram source with inline URL editing, domain filter chips, and adapter badges |
| 🎨 | **Dark UI** — sleek dark theme built with Tailwind v4 + shadcn/ui |
| 📊 | **Stats & Dashboard** — library insights, unread counts, status charts, cadence info, and Recent Activity |

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite 5 (port 3000) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Language | TypeScript 5 |
| Data Fetching | TanStack Query v5 + tRPC v11 React hooks |
| API Backend | Express 4 + tRPC v11 (port 3001 locally, Vercel Serverless in prod) |
| ORM | Drizzle ORM — neon-http driver |
| Database | Neon PostgreSQL (serverless HTTP driver) |
| Monorepo | PNPM Workspaces + TurboRepo |
| Telegram Sync | teleproto (MTProto personal account) |
| Scraping | Cheerio + got-scraping + FlareSolverr + Playwright |
| Hosting | Vercel (frontend + API) + Render (background worker) |

> State management is handled entirely by TanStack Query — no Redux.

## Project Structure

```
manwha-tracker/
├── apps/
│   ├── api/                  Express + tRPC — port 3001 (Vercel Serverless)
│   │   └── src/modules/
│   │       ├── manhwa/       CRUD, progress, sources
│   │       ├── settings/     App settings + Telegram auth
│   │       ├── stats/        Stats queries
│   │       └── sync/         Sync state + history
│   ├── web/                  Vite + React — port 3000
│   │   └── src/features/
│   │       ├── dashboard/    Quick stats, Continue Reading, Recent Activity
│   │       ├── manhwa/       Library + Add Manhwa
│   │       ├── manhwa-detail/ Detail view, sources, progress, chapters
│   │       ├── search/       GlobalSearch component
│   │       ├── settings/     Telegram auth wizard, sync history, system
│   │       ├── sources/      Unified sources page (websites + Telegram)
│   │       ├── stats/        Stats page
│   │       └── sync/         Sync history drawer + run cards
│   └── worker/               Express — port 3002 (Docker on Render)
│       └── src/modules/
│           ├── sync/         Website sync engine (processor, source-processor, utils)
│           └── settings/     Worker settings
├── libs/
│   ├── database/             Shared DB layer — Drizzle ORM, Neon HTTP
│   │   └── src/
│   │       ├── manhwa/       read, write, creation repositories
│   │       ├── telegram/     channel mapping, chapter inserts
│   │       ├── sync.repository.ts
│   │       └── settings.repository.ts
│   ├── parser/               Scraping engine — adapters + HTTP utilities
│   │   └── src/adapters/
│   │       ├── sites/        One file per supported site
│   │       └── utils/        Chapter extraction, slug derivation, time parsing
│   ├── shared/               Shared types, Zod schemas, constants
│   └── utils/                Cadence evaluation, search engine
├── .env.example
├── turbo.json
└── pnpm-workspace.yaml
```

## Getting Started

### Prerequisites

- Node.js >= 24
- pnpm >= 9
- Neon PostgreSQL account
- Telegram API ID + Hash + phone number (for Telegram sync)

### Local Development

> All commands must be run from the **monorepo root** — not inside `apps/web` or `apps/api`.

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Push the database schema to Neon
pnpm run db:push

# 4. Start everything (frontend + API + worker)
pnpm dev
```

- Frontend: **http://localhost:3000**
- API: **http://localhost:3001**
- Worker: **http://localhost:3002**

> If you get a port conflict, run `npx kill-port 3000 3001 3002` first.

> The Telegram watcher will fail locally if Telegram is blocked on your network — the UI still works fully without it.

---

## Deployment Architecture

This project uses a hybrid free hosting strategy:

| Service | Host | Purpose |
|---|---|---|
| Frontend + tRPC API | **Vercel** | Serves UI, fast DB queries via Serverless Functions |
| Background Worker | **Render** (Docker) | Telegram watcher, Telegram bot, `sync.run` endpoint |
| FlareSolverr | **Render** (free tier) | Headless browser rendering for Cloudflare-protected sites |
| Database | **Neon PostgreSQL** | Shared between Vercel and Render |

### Environment Variables

**Vercel:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `APP_SECRET` | Shared secret |
| `VITE_APP_SECRET` | Same as `APP_SECRET` |
| `VITE_SYNC_URL` | Render worker URL (e.g. `https://your-api.onrender.com`) |

**Render (Worker):**

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `APP_SECRET` | Same as Vercel `APP_SECRET` |
| `FRONTEND_URL` | Your Vercel URL |
| `FLARESOLVERR_URL` | Your FlareSolverr URL on Render |
| `TELEGRAM_API_ID` | Telegram app API ID |
| `TELEGRAM_API_HASH` | Telegram app API Hash |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token |
| `ALLOWED_CHAT_ID` | Your Telegram chat ID |
| `RENDER_EXTERNAL_URL` | Auto-set by Render — used for keep-alive self-pings |

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `manhwa` | Core records (title, slug, cover, status, genres) |
| `sources` | Telegram/website sources per manhwa |
| `chapters` | Discovered chapters (from Telegram or website sync) |
| `progress` | Last-read chapter + timestamp per manhwa |
| `settings` | Key-value store — app toggles + DB-backed sync lock |
| `sync_runs` | Sync run history with status (`running`/`completed`/`failed`) |

> Uses `drizzle-orm/neon-http` — no transactions, no relational query API. All queries use plain `select/insert/update/delete`.

### Updating the Schema

```bash
pnpm run db:generate
pnpm run db:migrate
```

---

## Website Adapters

Chapter sync adapters live in `libs/parser/src/adapters/sites/`:

| Site | Adapter Key | Browser Rendering |
|------|------------|-------------------|
| AsuraScans | `asurascans` | ✅ FlareSolverr / Playwright |
| Reaper Scans | `reaperscans` | — |
| Webtoon | `webtoon` | — |
| manhuaus.com | `manhuaus` | — |
| Arena Scans | `arenascans` | — |
| Comix.to | `comixto` | ✅ Playwright only |
| Mgeko | `mgeko` | ✅ + click to load all |
| MGRead | `mgread` | ✅ + click to load all |
| Thunder Scans | `thunderscans` | ✅ + click show all |
| Infinite Level Up | `infinitelevelup` | — |
| Ultimate of All Ages | `ultimateofallages` | ✅ FlareSolverr / Playwright |
| Vortex Scans | `vortexscans` | — |
| Generic (catch-all) | `generic` | — |

> Sites marked "click to load all" need a button interaction after rendering. This works locally via Playwright but **not** on Render (FlareSolverr returns the page without clicking).

### Fix Adapter Keys

Sources added before per-site detection existed may have a stale `adapterKey = 'website'` in the DB.

**Fix in one click:** go to **Sources → Fix Adapters** (wand icon, top-right). This calls `manhwa.redetectAdapterKeys`, re-runs `detectAdapterKey(url)` for every website source, and refreshes the page.

---

## Telegram Watcher

How it works:
- **New chapter posted** in a tracked channel → automatically added to the database
- **You read messages** in a tracked channel → your last-read chapter updates automatically
- Purely event-driven — no historical scanning (avoids cross-promotion false positives)

The watcher runs as part of the Worker on Render. It connects via the MTProto personal account using `teleproto`.

# Manhwa Tracker

A personal, single-user Manhwa/Manga reading tracker. Automatically monitors chapter releases from Telegram channels and websites, and tracks your reading progress hands-free.

## Features

- 📚 **Unified library** — 200+ manhwa titles in one place
- 📖 **Auto reading progress** — opens a chapter in Telegram → last-read chapter updates automatically
- 🔔 **New chapter detection** — Telegram watcher detects new chapter posts in real-time
- 🌐 **Website sync** — scrapes AsuraScans, Reaper Scans, Webtoon, manhuaus.com, Arena Scans, Comix.to, Mgeko, RoliaScan, Thunder Scans, Ultimate of All Ages for latest chapters
- 🔗 **Unified Sources page** — manage every website and Telegram source in one place with inline URL editing, domain-based filter chips, and adapter badges
- 🔧 **Fix Adapter Keys** — one-click button to re-detect and correct stale adapter keys across all website sources
- 🎨 **Dark theme** — sleek dark manhwa-focused UI built with Tailwind v4 + shadcn/ui
- ➕ **Manual add** — add any manhwa manually with cover, genres, status, and chapter progress
- 📊 **Dashboard** — stats, Continue Reading, Recent Activity

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite 5 (port 3000) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Language | TypeScript 5 |
| Data Fetching | TanStack Query v5 + tRPC React hooks |
| API Backend | Express 4 + tRPC v11 (port 3001 locally, Vercel Serverless in prod) |
| ORM | Drizzle ORM (plain query builder — neon-http driver) |
| Validation | Zod |
| Database | Neon PostgreSQL (serverless HTTP driver) |
| Monorepo | PNPM Workspaces + TurboRepo |
| Telegram Sync | teleproto (MTProto personal account) |
| Scraping | Cheerio + FlareSolverr (for protected sites) |
| Hosting | Vercel (frontend + fast API) + Render (background worker) |

> **Note:** State management is handled entirely by TanStack Query — no Zustand or Redux.

## Project Structure

```
manhwa-tracker/
├── apps/
│   ├── web/              # Vite + React frontend
│   │   └── src/
│   │       ├── features/ # Feature-based structure (dashboard, manhwa, manhwa-detail, settings, sources)
│   │       │   └── sources/  # Unified Sources page
│   │       │       ├── SourcesPage.tsx        # Main page (filter chips, desktop table, mobile cards)
│   │       │       ├── components/
│   │       │       │   ├── SourceRow.tsx      # Desktop table row with inline URL editing
│   │       │       │   └── SourceCard.tsx     # Mobile card with inline URL editing
│   │       │       └── utils/
│   │       │           └── adapterColors.ts   # Adapter key → badge colour mapping
│   │       ├── components/
│   │       │   ├── layout/   # AppShell, Navbar
│   │       │   └── ui/       # shadcn/ui components
│   │       └── lib/
│   │           └── trpc.ts   # tRPC client
│   ├── api/              # Express + tRPC API server (Vercel Serverless)
│   │   └── src/
│   │       └── modules/
│   │           ├── manhwa/   # manhwa router
│   │           ├── sync/     # sync router (queries only)
│   │           └── settings/ # settings router
│   └── worker/           # Background Docker service (Render)
│       └── src/
│           ├── modules/  # Worker-local modules: manhwa (service+repos), sync (SyncService.run), telegram
│           │             # Note: SettingsRepository comes from @manhwa-tracker/database — not duplicated here
│           └── scripts/
│               ├── watcher/            # teleproto event-driven watcher
│               ├── bot/                # Telegram alert bot service
│               └── cron/               # Website sync runner (cron-sync.ts)
├── libs/
│   ├── database/         # Drizzle schema + Neon client singleton + SettingsRepository (shared by api & worker)
│   ├── parser/           # Website adapters (AsuraScans, Webtoon, Reaper, manhuaus, Arena Scans, Comix.to, Mgeko, RoliaScan, Thunder Scans, Ultimate of All Ages, generic)
│   └── shared/           # Shared TypeScript types + constants (ADAPTER_KEYS, MANHWA_STATUS, etc.)
└── .github/
    └── workflows/
        └── sync-cron.yml # GitHub Actions cron for website sync
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Neon PostgreSQL account
- Telegram API ID, API Hash, and phone number (for Telegram sync)

### Local Development

> All commands must be run from the **monorepo root** (`manhwa-tracker/`), not inside `apps/web` or `apps/api`.

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up environment variables**

   Copy the example `.env` file at the root:
   ```bash
   cp .env.example .env
   ```
   Fill in your `DATABASE_URL`, `APP_SECRET`, and Telegram credentials.

3. **Sync the database schema**
   ```bash
   pnpm run db:push
   ```

4. **Start the full app (frontend + backend together)**

   > If you get a port conflict error, first run: `npx kill-port 3000 3001`

   ```bash
   pnpm dev
   ```

   - Frontend: **http://localhost:3000**
   - API: **http://localhost:3001**

   > The Telegram watcher will fail to connect locally if Telegram is blocked on your network. This is expected — the UI still works fully.

---

## Deployment Architecture

This project uses a **hybrid hosting** strategy to stay 100% free:

| Service | Host | Purpose |
|---|---|---|
| Frontend + Fast tRPC API | **Vercel** | Serves UI, handles all fast DB queries via Serverless Functions |
| Background Worker | **Render** (Docker) | Runs Telegram watcher, Telegram bot, handles `sync.run` |
| FlareSolverr | **Render** (sleeps when idle) | Browser rendering for protected manga sites |
| Database | **Neon PostgreSQL** | Shared between Vercel and Render |

### Vercel Environment Variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon Postgres URL |
| `APP_SECRET` | Your shared secret |
| `VITE_APP_SECRET` | Same as `APP_SECRET` |
| `VITE_SYNC_URL` | Your Render worker URL (e.g. `https://your-api.onrender.com`) |

### Render Environment Variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon Postgres URL |
| `APP_SECRET` | Same as Vercel `APP_SECRET` |
| `FRONTEND_URL` | Your Vercel URL (e.g. `https://your-app.vercel.app`) |
| `FLARESOLVERR_URL` | Your FlareSolverr URL on Render |
| `TELEGRAM_API_ID` | Your Telegram API ID |
| `TELEGRAM_API_HASH` | Your Telegram API Hash |
| `TELEGRAM_BOT_TOKEN` | Your Telegram Bot Token |
| `ALLOWED_CHAT_ID` | Your Telegram chat ID |

### Environment Variables

Copy `.env.example` to `.env` at the workspace root and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `TELEGRAM_API_ID` | Telegram app API ID |
| `TELEGRAM_API_HASH` | Telegram app API Hash |
| `TELEGRAM_PHONE` | Your Telegram phone number |
| `VITE_API_URL` | Frontend API URL (default: `http://localhost:3001`) |

### Running the Telegram Services

The bot and the watcher are long-running background scripts:


How the Watcher works:
- **New chapter posted** in a tracked channel → automatically added to the database
- **You read messages** in a tracked channel → your last-read chapter updates automatically
- Purely event-driven — no historical scanning (safe from cross-promotion false positives)

## Database Schema

| Table | Purpose |
|-------|---------|
| `manhwa` | Core manhwa records (title, slug, cover, status, genres) |
| `sources` | Telegram/website sources per manhwa |
| `chapters` | Discovered chapters per manhwa (from Telegram or website sync) |
| `progress` | Single progress row per manhwa (last read chapter + timestamp) |
| `settings` | Key-value app settings |

> Uses `drizzle-orm/neon-http` driver — **no transactions, no relational query API**. All queries use plain `select/insert/update/delete` with manual joins.

### Updating the Database Schema
If you make changes to `libs/database/src/schema/index.ts`, you must generate and apply migrations to Neon:
```bash
pnpm run db:generate
pnpm run db:migrate
```

## Website Adapters

Chapter sync is powered by adapter classes in `libs/parser/src/adapters/sites/`:

| Site | Adapter Key | URL Patterns |
|------|------------|-------------|
| AsuraScans | `asurascans` | `asurascans.com`, `asuracomic.net`, `asurascan.com` |

| manhuaus.com | `manhuaus` | `manhuaus.com` |
| Arena Scans | `arenascans` | `arenascans.net` |
| Comix.to | `comixto` | `comix.to` |
| Mgeko | `mgeko` | `mgeko.com`, `mgeko.cc`, `mgeko.net` |
| MGRead | `mgread` | `mgread.io` |
| RoliaScan | `roliascan` | `roliascan.com` |
| Thunder Scans | `thunderscans` | `thunderscans.net` |
| Infinite Level Up | `infinitelevelup` | `infinitelevelup.com` |
| Ultimate of All Ages | `ultimateofallages` | `ultimateofallages.com` |
| Generic (catch-all) | `generic` | any URL not matched above |

Use `detectAdapterKey(url)` from `@manhwa-tracker/parser` to resolve the right adapter automatically.

### Fix Adapter Keys

Sources added before per-site detection was implemented may have `adapterKey = 'website'` stored in the database instead of the correct key (e.g. `asurascans`).

To fix all stale keys in one shot:

1. Go to the **Sources** page in the web UI
2. Click the **Fix Adapters** button (wand icon, top-right)
3. The button calls `manhwa.redetectAdapterKeys` which loops over every website source row, runs `detectAdapterKey(url)` and writes the correct key back — then invalidates the query cache so the page refreshes immediately.

Alternatively, trigger it via tRPC directly:

```ts
await trpc.manhwa.redetectAdapterKeys.mutate();
// returns: { fixed: N }  — N = number of rows updated
```

## Sources Management

The **Unified Sources** page (`/sources`) lets you manage every source in one place:

- **Two tabs**: Websites / Telegram
- **Domain filter chips** — one chip per unique hostname in the DB (e.g. `asurascans.com (12)`, `asuracomic.net (3)`). Each chip is coloured by its adapter. Chips reset when switching tabs.
- **Adapter badges** — every row/card shows a colour-coded adapter badge (orange for asurascans, red for reaperscans, violet for thunderscans, etc.)
- **Inline URL editing** — click the pencil icon to edit a source URL directly. The adapter key is automatically re-detected from the new URL on save.
- **Mobile card layout** — on screens smaller than `md` breakpoint, sources render as tap-friendly cards with a full-width Edit URL button instead of the desktop table.
- **Fix Adapters button** — top-right; one-click batch re-detection for all website sources.

### Adapter Badge Colours

| Adapter | Colour |
|---------|--------|
| `asurascans` | Orange |
| `reaperscans` | Red |
| `webtoon` | Sky blue |
| `thunderscans` | Violet |
| `manhuaus` | Yellow |
| `infinitelevelup` | Emerald |
| `mgeko` | Pink |
| `arenascans` | Cyan |
| `roliascan` | Lime |
| `comixto` | Fuchsia |
| `ultimateofallages` | Teal |
| `telegram` | Blue |
| `generic` | Zinc |

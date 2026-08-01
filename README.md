# Manhwa Tracker

A personal, single-user Manhwa/Manga reading tracker. Automatically monitors chapter releases from Telegram channels and websites, and tracks your reading progress hands-free.

## Features

- 📚 **Unified library** — 200+ manhwa titles in one place
- 📖 **Auto reading progress** — opens a chapter in Telegram → last-read chapter updates automatically
- 🔔 **New chapter detection** — Telegram watcher detects new chapter posts in real-time
- 🌐 **Website sync** — scrapes AsuraScans, Reaper Scans, Webtoon, manhuaus.com for latest chapters
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
| API Backend | Express 4 + tRPC v11 (port 3001) |
| ORM | Drizzle ORM (plain query builder — neon-http driver) |
| Validation | Zod |
| Database | Neon PostgreSQL (serverless HTTP driver) |
| Monorepo | PNPM Workspaces + TurboRepo |
| Telegram Sync | GramJS (MTProto personal account) |
| Scraping | Cheerio |

> **Note:** State management is handled entirely by TanStack Query — no Zustand or Redux.

## Project Structure

```
manhwa-tracker/
├── apps/
│   ├── web/              # Vite + React frontend
│   │   └── src/
│   │       ├── features/ # Feature-based structure (dashboard, manhwa, manhwa-detail, settings)
│   │       ├── components/
│   │       │   ├── layout/   # AppShell, Navbar
│   │       │   └── ui/       # shadcn/ui components
│   │       └── lib/
│   │           └── trpc.ts   # tRPC client
│   └── api/              # Express + tRPC API server
│       └── src/
│           ├── modules/
│           │   ├── manhwa/   # manhwa router/service/repository
│           │   ├── sync/     # website sync router/service/repository
│           │   ├── settings/ # settings router
│           └── scripts/
│               ├── watcher/            # GramJS event-driven watcher
│               ├── bot/                # Telegram alert bot service
│               ├── cron/               # Website sync runner
│               └── backfill-covers.ts  # One-off cover backfill
├── libs/
│   ├── database/         # Drizzle schema + Neon client singleton
│   ├── parser/           # Website adapters (AsuraScans, Webtoon, Reaper, manhuaus, generic)
│   └── shared/           # Shared TypeScript types
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

### Setup on a New Machine

When pulling this repository on another laptop, **all commands must be run from the monorepo root directory** (`manhwa-tracker/`), unless specified otherwise. Turborepo and pnpm workspaces will automatically route commands to the correct apps (`web` or `api`).

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Setup Environment Variables**
   ```bash
   # Copy the root .env.example
   cp .env.example .env
   # Copy the web app's .env.example 
   cp apps/web/.env.example apps/web/.env
   ```

3. **Fill in your secrets:**
   - Open the root `.env` file and provide your `DATABASE_URL` (Neon PostgreSQL), Telegram credentials, and a randomly generated `APP_SECRET` (e.g. `openssl rand -hex 32`).
   - Open `apps/web/.env` and ensure `VITE_APP_SECRET` is set to the exact same value as your `APP_SECRET`.

4. **Sync the Database Schema**
   ```bash
   pnpm run db:push
   ```

5. **Start the Application**
   ```bash
   pnpm dev
   ```

Frontend runs at **http://localhost:3000**, API at **http://localhost:3001**.

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

| Site | Adapter Key |
|------|------------|
| AsuraScans | `asurascans` |
| Webtoon | `webtoon` |
| Reaper Scans | `reaperscans` |
| manhuaus.com | `manhuaus` |
| Generic (catch-all) | `generic` |

Use `detectAdapterKey(url)` from `@manhwa-tracker/parser` to resolve the right adapter automatically.

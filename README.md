# Manhwa Tracker

A personal Manhwa/Manga reading tracker with a unified library, automatic chapter sync from Telegram channels and websites, and reading progress tracking.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 + Radix UI (shadcn-like) |
| Language | TypeScript 5 |
| Data Fetching | TanStack Query v5 |
| State | Zustand |
| API Backend | Node.js + tRPC v11 + Express |
| ORM | Drizzle ORM |
| Validation | Zod |
| Database | Neon PostgreSQL |
| Monorepo | PNPM |
| Telegram Sync | GramJS |

## Project Structure

```
manhwa-tracker/
├── apps/
│   ├── web/          # Vite + React — main frontend app
│   └── api/          # tRPC Server + Sync scripts (Telegram/Scraping)
├── libs/
│   ├── database/     # Drizzle schema + Neon client
│   ├── shared/       # Types, DTOs, Zod schemas
│   ├── utils/        # Pure utility functions
│   ├── parser/       # Website chapter extraction & adapters
│   └── ui/           # Shared UI components
└── .github/
    └── workflows/
        └── sync-cron.yml  # Cron job for website sync
```

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Neon PostgreSQL account
- Telegram API ID/Hash (for Telegram Sync)

### Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env  # fill in your values
pnpm run db:push
pnpm dev
```

### Environment Variables

See `apps/api/.env` for all required variables (Database URL, Telegram credentials, etc).

## Development Phases

- **Phase 1** — Library, Progress, Dashboard, Neon DB *(Completed)*
- **Phase 2** — Telegram sync, Website adapters, GitHub Actions *(Implementation complete; production validation pending)*
- **Phase 3** — Chrome Extension, Notifications *(Future)*
- **Phase 4** — OCI migration, Analytics, PWA *(Future)*

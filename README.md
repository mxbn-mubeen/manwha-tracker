# Manhwa Tracker

A personal Manhwa/Manga reading tracker with unified library, automatic chapter sync from Telegram channels and websites, reading progress tracking, and browser extension.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| UI | Chakra UI |
| Data Fetching | TanStack Query v5 |
| State | Zustand |
| API | tRPC v11 |
| ORM | Drizzle ORM |
| Validation | Zod |
| Database | Neon PostgreSQL |
| Monorepo | PNPM + TurboRepo |
| Scheduler | GitHub Actions → OCI (Phase 4) |
| Hosting | Vercel |

## Project Structure

```
manhwa-tracker/
├── apps/
│   ├── web/          # Next.js 15 — main app
│   ├── worker/       # Sync scripts (GitHub Actions / OCI)
│   └── extension/    # Chrome Extension MV3
├── packages/
│   ├── database/     # Drizzle schema + Neon client
│   ├── shared/       # Types, DTOs, Zod schemas
│   ├── utils/        # Pure utility functions
│   ├── parser/       # Chapter number/title extraction
│   └── ui/           # Shared Chakra UI components
└── .github/
    └── workflows/
        └── sync.yml  # Cron every 30 min
```

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9
- Neon PostgreSQL account

### Setup

```bash
pnpm install
cp .env.example .env.local  # fill in your values
pnpm db:push
pnpm dev
```

### Environment Variables

See `.env.example` for all required variables.

## Development Phases

- **Phase 1** — Library, Progress, Dashboard, Neon DB
- **Phase 2** — Telegram sync, Website adapters, GitHub Actions
- **Phase 3** — Chrome Extension, Notifications
- **Phase 4** — OCI migration, Analytics, PWA

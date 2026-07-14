# Architecture — Manhwa Tracker

project_root: D:\manwha-tracker
source: implementation plan session 2026-07-14

## Monorepo Structure

```
D:\manwha-tracker\
├── apps\
│   ├── web\          Next.js 15 (App Router) — Vercel
│   ├── worker\       Sync scripts (Node.js) — GitHub Actions / future OCI
│   └── extension\    Chrome Extension MV3 — Vite + CRXJS
├── packages\
│   ├── database\     Drizzle ORM schema + Neon client singleton
│   ├── shared\       Types, DTOs, Zod schemas
│   ├── utils\        Pure utility functions
│   ├── parser\       Chapter number + title extraction logic
│   └── ui\           Shared Chakra UI components
├── docs\
├── .github\
│   └── workflows\
│       └── sync.yml  Cron every 30 min
├── package.json      PNPM workspaces root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Database Schema (Neon PostgreSQL via Drizzle ORM)

Tables:

| Table | Key Columns |
|-------|-------------|
| manhwa | id, slug, title, cover_url, status, genres[], created_at |
| sources | id, manhwa_id, type (telegram\|website), url, adapter_key, priority, is_active |
| chapters | id, manhwa_id, source_id, chapter_num, title, url, published_at, discovered_at |
| progress | id, manhwa_id, chapter_id, last_read_at, is_completed |
| notifications | id, manhwa_id, chapter_id, type, sent_at, is_read |
| settings | id, key, value (jsonb), updated_at |

No user_id — single user app.

Relationships:
- manhwa → sources (1:many)
- manhwa → chapters (1:many)
- manhwa → progress (1:1 per manhwa)
- chapters → notifications (1:many)

## Frontend Architecture (apps/web)

```
app/
  layout.tsx                Root layout (Chakra, TanStack Query providers)
  dashboard/page.tsx        Continue Reading, New Chapters, Source Status
  library/page.tsx          All tracked manhwa
  library/[slug]/page.tsx   Manhwa detail + chapter list + sources
  settings/page.tsx         App settings, channel config
features/
  dashboard/                Dashboard components, hooks, server data
  library/                  Library CRUD, search, filter
  tracking/                 Progress read/write logic
  notifications/            Notification bell + list
  settings/                 Settings management
server/
  api/
    routers/
      manhwa.ts
      progress.ts
      sync.ts
      notifications.ts
    root.ts
    trpc.ts
  db/
    manhwa.repository.ts
    progress.repository.ts
    chapter.repository.ts
  services/
    manhwa.service.ts
    sync.service.ts
    notification.service.ts
lib/
  trpc/client.tsx
  trpc/server.ts
```

## Backend / API Layer

REST fallbacks (for worker + extension):

| Method | Path | Purpose |
|--------|------|---------|
| GET | /api/dashboard | Dashboard summary data |
| GET | /api/library | All manhwa list |
| POST | /api/manhwa | Add manhwa |
| PUT | /api/progress | Update reading progress |
| POST | /api/sync | Trigger manual sync |
| GET | /api/notifications | Unread notifications |
| POST | /api/extension/progress | Extension → progress update |

Primary API is tRPC, REST is fallback for non-browser clients.

## Telegram Sync (apps/web/features/telegram + apps/worker)

- GramJS MTProto personal account
- Reads joined manhwa channels
- Parses chapter number from message text
- Detects media download event → marks chapter as last_read in progress table
- Files: telegram.client.ts, channel.reader.ts, message.parser.ts, download-watcher.ts, channel.sync.ts

## Website Adapters (apps/web/features/websites)

Common interface: detectTitle(), latestChapter(), chapterList()

| Site | Method |
|------|--------|
| MangaDex | Public REST API (no scraping) |
| Webtoon | Cheerio HTML parse |
| AsuraScans | Cheerio HTML parse + anti-Cloudflare headers |
| Reaper Scans | Cheerio HTML parse |
| Flame Comics | Cheerio HTML parse |
| manhuaus.com | Cheerio HTML parse |

Factory pattern: AdapterFactory.for(url) → correct adapter instance

## Scheduler (apps/worker + .github/workflows/sync.yml)

- GitHub Actions cron: every 30 minutes
- Runs sync-telegram.ts + sync-websites.ts
- Connects to Neon directly via DATABASE_URL env
- Business logic fully decoupled from scheduler (OCI migration = new entrypoint only)

## Chrome Extension (apps/extension)

- Manifest V3
- Content script: detects title + chapter number on page DOM
- Background service worker: debounces, POSTs to /api/extension/progress
- Build: Vite + CRXJS
- Popup: mini React UI showing current manhwa + progress

## Design Patterns Used

- Feature-Based Architecture (web app)
- Repository Pattern (db layer)
- Service Pattern (business logic)
- Adapter Pattern (website connectors)
- Factory Pattern (adapter selection)
- Strategy Pattern (sync sources)
- Observer Pattern (notifications)
- Singleton (Neon DB connection)
- DTO Pattern (tRPC inputs/outputs)

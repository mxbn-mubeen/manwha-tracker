# Dependency Graph — Manhwa Tracker

Regenerated from source: 2026-08-28

---

## Package Dependencies (actual)

```
apps/api    → imports → @manhwa-tracker/database, @manhwa-tracker/parser, @manhwa-tracker/shared
apps/worker → imports → @manhwa-tracker/database, @manhwa-tracker/parser, @manhwa-tracker/shared
apps/web    → imports → @manhwa-tracker/shared, @manhwa-tracker/ui, @manhwa-tracker/utils
              (no direct DB/parser imports — all data access goes through tRPC)

libs/database  → imports → (none — leaf node, exports db + schema)
libs/parser    → imports → @manhwa-tracker/shared, @manhwa-tracker/utils
libs/shared    → imports → (none — leaf node, types + constants)
libs/ui        → imports → (shadcn/ui primitives used by apps/web)
libs/utils     → imports → (none — leaf node)
```

Notes:
- `apps/web` does NOT import `@manhwa-tracker/database` or `@manhwa-tracker/parser` — all data
  access flows through tRPC. This is the key architectural constraint of the Vite + Express
  decoupled setup.
- `apps/api` and `apps/worker` do **not** import from each other. Each has its own
  `modules/manhwa`, `modules/sync`, `modules/settings`, `modules/telegram` — worker-local copies
  of the same file layout, not shared code — so the two apps can be deployed independently
  (Vercel Serverless for api, a long-running Docker container for worker).

---

## Internal Module Dependencies (apps/api)

```
src/env.ts                    → imports → dotenv, path  (loads root .env)
src/server.ts                 → imports → src/env.ts, src/root.ts, express, cors  (local dev)
src/vercel.ts                 → imports → src/root.ts  (Vercel Serverless entry point)
src/root.ts                   → imports → manhwa.router, sync.router, settings.router, src/trpc.ts
src/trpc.ts                   → imports → @trpc/server, superjson
src/modules/manhwa/
  manhwa.router.ts             → imports → manhwa.service.ts, zod, src/trpc.ts, src/utils/trpc-error.ts
  manhwa.service.ts            → imports → manhwa.repository.ts, manhwa.read.repository.ts,
                                            progress.repository.ts, sources.repository.ts,
                                            @manhwa-tracker/parser
  manhwa.repository.ts         → imports → @manhwa-tracker/database (db, manhwa, progress, sources, chapters), drizzle-orm
  sources.repository.ts        → imports → @manhwa-tracker/database, @manhwa-tracker/parser (detectAdapterKey)
src/modules/sync/
  sync.router.ts               → imports → sync.service.ts, zod, src/trpc.ts
  sync.service.ts               → imports → sync.repository.ts
  sync.repository.ts           → imports → @manhwa-tracker/database, drizzle-orm
src/modules/settings/
  settings.router.ts           → imports → settings.repository.ts, teleproto, src/utils/telegram-client.ts,
                                            src/utils/trpc-error.ts, src/trpc.ts
  settings.repository.ts       → imports → @manhwa-tracker/database, drizzle-orm
src/modules/telegram/
  telegram.repository.ts       → imports → @manhwa-tracker/database, drizzle-orm
src/routes/
  proxy.ts                     → imports → express
  health.ts                    → imports → express, net (raw TCP probes for the diagnostic route)
src/utils/
  telegram-client.ts           → imports → teleproto
  trpc-error.ts                → imports → @trpc/server
```

Note: `apps/api` has no `src/scripts/` directory — the Telegram watcher, Telegram bot, and
cron-sync scripts all live under `apps/worker/src/scripts/` (see below). `apps/api` does still
import `teleproto` directly, but only for the in-app Telegram login flow in `settings.router.ts`,
not for the watcher or bot.

## Internal Module Dependencies (apps/worker)

```
src/env.ts                    → imports → dotenv, path  (loads root .env)
src/server.ts                 → imports → src/env.ts, modules/sync/sync.service.ts,
                                            scripts/watcher (startWatcher), scripts/bot/poll.ts,
                                            express, cors
src/modules/sync/
  sync.service.ts             → imports → sync.repository.ts, @manhwa-tracker/parser
  sync.repository.ts          → imports → @manhwa-tracker/database, drizzle-orm
src/modules/manhwa/           → same file layout/imports as apps/api's copy (independent code)
src/modules/settings/
  settings.repository.ts      → imports → @manhwa-tracker/database, drizzle-orm
src/modules/telegram/
  telegram.repository.ts      → imports → @manhwa-tracker/database, drizzle-orm — used by the watcher
src/scripts/cron/
  cron-sync.ts                → imports → src/env.ts, modules/sync/sync.service.ts
src/scripts/watcher/
  index.ts                    → imports → teleproto, teleproto/events, teleproto/network,
                                            src/utils/telegram-client.ts, modules/telegram/telegram.repository.ts,
                                            @manhwa-tracker/parser, ./handlers.ts, ./channel-map.ts,
                                            ./reconcile.ts, ./session.ts
  reconcile.ts                → imports → teleproto, modules/telegram/telegram.repository.ts
  handlers.ts                 → imports → modules/telegram/telegram.repository.ts, @manhwa-tracker/parser
  channel-map.ts               → imports → @manhwa-tracker/database, drizzle-orm
  session.ts                  → imports → src/utils/bot-alert.ts
src/scripts/bot/
  index.ts                    → imports → ./poll.ts
  poll.ts                     → imports → ./api.ts, ./handlers.ts
  handlers.ts                 → imports → modules/manhwa/*, @manhwa-tracker/database
  api.ts                      → imports → (raw fetch to the Telegram Bot API)
src/utils/
  telegram-client.ts          → imports → teleproto
  bot-alert.ts                 → imports → scripts/bot/api.ts
```

⚠️ Scripts that DO NOT EXIST (were in brain/roadmap but were never written, or existed in an older
layout under `apps/api` and were never carried over): `backfill-covers.ts`, `telegram-scan.ts`,
`telegram-import.ts`, `telegram-import-from-csv.ts`, `import-from-enriched-csv.ts`, `fix-progress.ts`,
`fix-db.ts`.

## Internal Module Dependencies (apps/web)

```
src/main.tsx        → imports → src/App.tsx, src/providers.tsx
src/providers.tsx   → imports → src/lib/trpc.ts, @tanstack/react-query
src/App.tsx         → imports → src/features/*/*, src/components/layout/AppShell, react-router-dom
src/lib/trpc.ts     → imports → @trpc/client, @trpc/react-query, superjson, apps/api type AppRouter
                                 (splitLink: sync.run → VITE_SYNC_URL (worker), everything else → VITE_API_URL)

src/features/dashboard/Dashboard.tsx            → imports → src/lib/trpc.ts, src/components/ui/*
src/features/manhwa/Library.tsx                 → imports → src/lib/trpc.ts, src/components/ui/*, ManhwaCard
src/features/manhwa/AddManhwa.tsx               → imports → src/lib/trpc.ts, AddManhwaForm
src/features/manhwa-detail/ManhwaDetail.tsx     → imports → ManhwaHeader, ManhwaPoster, ProgressCard, SourcesList, EditManhwaModal, UnreadManhwaStrip, src/lib/trpc.ts
src/features/manhwa-detail/components/
  ManhwaHeader.tsx    → imports → src/lib/trpc.ts (updateStatus), src/components/ui/badge
  ManhwaPoster.tsx    → imports → src/components/ui/*
  ProgressCard.tsx    → imports → src/components/ui/*
  SourcesList.tsx     → imports → src/lib/trpc.ts (addSource, removeSource), src/components/ui/*
  EditManhwaModal.tsx → imports → src/lib/trpc.ts (update), src/components/ui/*
src/features/search/GlobalSearch.tsx            → imports → src/lib/trpc.ts
src/features/sync/SyncHistoryDrawer.tsx         → imports → src/lib/trpc.ts (sync.getHistory)
src/features/settings/Settings.tsx              → imports → TelegramSection, SyncHistorySection, RecentlyDeletedSection, src/lib/trpc.ts
src/components/layout/AppShell.tsx              → imports → src/lib/trpc.ts (sync.run), react-router-dom, lucide-react
src/utils/image.ts                              → imports → (rewrites/proxies cover image URLs, incl. MangaDex host handling)
```

---

## External Dependencies (actual installed)

```
apps/api:
  express              → HTTP server
  cors                 → CORS middleware
  @trpc/server         → tRPC router + procedures
  drizzle-orm          → ORM (plain query builder only — no relational API)
  @neondatabase/serverless → neon-http driver (via libs/database)
  zod                  → Input validation
  superjson            → tRPC data transformer
  teleproto            → Telegram MTProto client — used here only for the in-app login flow
                          (settings.router.ts), NOT for a watcher or bot
  got-scraping         → HTTP fetching (via libs/parser)
  big-integer, input    → teleproto's own runtime deps, listed explicitly
  dotenv               → Env vars (loaded via src/env.ts, resolves root .env)
  tsx                  → TypeScript script runner

apps/worker:
  express, cors, drizzle-orm, zod, superjson, dotenv, tsx  → same roles as in apps/api
  @trpc/server         → only used to type the sync.run response shape
  teleproto            → Telegram MTProto client — powers the watcher (scripts/watcher/) here
  got-scraping         → HTTP fetching (via libs/parser)

apps/web:
  react, react-dom              → UI framework
  react-router-dom              → Client-side routing
  @trpc/client                  → tRPC client
  @trpc/react-query              → tRPC + TanStack Query hooks
  @tanstack/react-query          → Data fetching / cache
  superjson                     → Shared transformer with API
  sonner                        → Toast notifications
  lucide-react                  → Icons
  tailwindcss v4                → Styling
  @radix-ui/*                   → Headless UI primitives behind shadcn/ui components
  class-variance-authority, clsx, tailwind-merge → shadcn/ui styling helpers
  zustand                       → present in package.json — note this contradicts the README's
                                   "state management is handled entirely by TanStack Query" claim;
                                   worth confirming whether it's actually used or dead weight

libs/database:
  drizzle-orm                   → ORM + schema definition
  @neondatabase/serverless      → Neon PostgreSQL HTTP driver

libs/parser:
  cheerio                       → HTML scraping for website adapters
  got-scraping                  → HTTP fetching with anti-bot-detection defaults
  playwright-core               → Browser rendering fallback for protected sites (browser.ts)
```

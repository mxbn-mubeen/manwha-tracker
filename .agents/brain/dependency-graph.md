# Dependency Graph — Manhwa Tracker

Regenerated from source: 2026-07-22

---

## Package Dependencies (actual)

```
apps/api  → imports → @manhwa-tracker/database, @manhwa-tracker/parser
apps/web  → imports → (no internal libs — all API calls go through tRPC to apps/api)

libs/database  → imports → (none — leaf node, exports db + schema)
libs/parser    → imports → (none — leaf node, exports adapters, metadata, extractors)
libs/shared    → imports → (none — leaf node, minimal types — may be deprecated)
```

Note: `apps/web` does NOT directly import `@manhwa-tracker/database` or `@manhwa-tracker/parser` — all data access flows through the tRPC API. This is the key architectural constraint of the Vite + Express decoupled setup.

---

## Internal Module Dependencies (apps/api)

```
src/env.ts                    → imports → dotenv, path  (loads root .env)
src/server.ts                 → imports → src/env.ts, src/root.ts, express, cors
src/root.ts                   → imports → manhwa.router, sync.router, settings.router, src/trpc.ts
src/trpc.ts                   → imports → @trpc/server, superjson
src/modules/manhwa/
  manhwa.router.ts             → imports → manhwa.service.ts, zod, src/trpc.ts
  manhwa.service.ts            → imports → manhwa.repository.ts, @manhwa-tracker/parser
  manhwa.repository.ts         → imports → @manhwa-tracker/database (db, manhwa, progress, sources, chapters), drizzle-orm
src/modules/sync/
  sync.router.ts               → imports → sync.service.ts, zod, src/trpc.ts
  sync.service.ts              → imports → sync.repository.ts, @manhwa-tracker/parser
  sync.repository.ts           → imports → @manhwa-tracker/database, drizzle-orm
src/modules/settings/
  settings.router.ts           → imports → @manhwa-tracker/database, drizzle-orm, src/trpc.ts
src/modules/telegram/         → imports → @manhwa-tracker/database, drizzle-orm
src/scripts/
  backfill-covers.ts           → imports → src/env.ts, @manhwa-tracker/database, node-fetch
  cron-sync.ts                 → imports → src/env.ts, src/modules/sync/sync.service.ts
  telegram-download-watcher.ts → imports → src/env.ts, gramjs, @manhwa-tracker/database, src/modules/telegram/*, @manhwa-tracker/parser
  fix-db.ts                    → imports → src/env.ts, @manhwa-tracker/database, drizzle-orm
```

## Internal Module Dependencies (apps/web)

```
src/main.tsx        → imports → src/App.tsx, src/providers.tsx
src/providers.tsx   → imports → src/lib/trpc.ts, @tanstack/react-query
src/App.tsx         → imports → src/features/*/*, src/components/layout/AppShell, react-router-dom
src/lib/trpc.ts     → imports → @trpc/client, @trpc/react-query, superjson, apps/api type AppRouter

src/features/dashboard/Dashboard.tsx            → imports → src/lib/trpc.ts, src/components/ui/*
src/features/manhwa/Library.tsx                 → imports → src/lib/trpc.ts, src/components/ui/*, ManhwaCard
src/features/manhwa/AddManhwa.tsx               → imports → src/lib/trpc.ts, src/components/ui/*
src/features/manhwa-detail/ManhwaDetail.tsx     → imports → ManhwaHeader, ManhwaPoster, ProgressCard, SourcesList, EditManhwaModal, src/lib/trpc.ts
src/features/manhwa-detail/components/
  ManhwaHeader.tsx    → imports → src/lib/trpc.ts (updateStatus), src/components/ui/badge
  ManhwaPoster.tsx    → imports → src/components/ui/*
  ProgressCard.tsx    → imports → src/components/ui/*
  SourcesList.tsx     → imports → src/lib/trpc.ts (addSource, deleteSource), src/components/ui/*
  EditManhwaModal.tsx → imports → src/lib/trpc.ts (update), src/components/ui/*
src/features/settings/Settings.tsx              → imports → src/lib/trpc.ts, src/components/ui/*
src/components/layout/AppShell.tsx              → imports → src/lib/trpc.ts (sync.run), react-router-dom, lucide-react
```

---

## External Dependencies (actual installed)

```
apps/api:
  express              → HTTP server
  cors                 → CORS middleware
  @trpc/server         → tRPC router + procedures
  drizzle-orm          → ORM (plain query builder only — no relational API)
  @neondatabase/serverless → neon-http driver
  zod                  → Input validation
  superjson            → tRPC data transformer
  gramjs               → Telegram MTProto (scripts only — telegram-download-watcher.ts)
  dotenv               → Env vars (loaded via src/env.ts, resolves root .env)
  tsx                  → TypeScript script runner

apps/web:
  react, react-dom              → UI framework
  react-router-dom              → Client-side routing
  @trpc/client                  → tRPC client
  @trpc/react-query             → tRPC + TanStack Query hooks
  @tanstack/react-query         → Data fetching / cache
  superjson                     → Shared transformer with API
  sonner                        → Toast notifications
  lucide-react                  → Icons
  tailwindcss v4                → Styling
  shadcn/ui components          → Button, Card, Badge, Input

libs/database:
  drizzle-orm                   → ORM + schema definition
  @neondatabase/serverless      → Neon PostgreSQL HTTP driver

libs/parser:
  cheerio                       → HTML scraping for website adapters
```

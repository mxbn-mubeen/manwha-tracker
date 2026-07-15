# Dependency Graph — Manhwa Tracker

Regenerated from source: 2026-07-16

---

## Package Dependencies (actual)

```
apps/api  → imports → @manhwa-tracker/database, @manhwa-tracker/parser
apps/web  → imports → (no internal libs — all API calls go through tRPC to apps/api)

libs/database  → imports → (none — leaf node, exports db + schema)
libs/parser    → imports → (none — leaf node, exports parseMetadataFromUrl)
libs/shared    → imports → (none — leaf node, minimal types)
```

Note: `apps/web` does NOT directly import `@manhwa-tracker/database` or `@manhwa-tracker/parser` — all data access flows through the tRPC API. This is the key architectural constraint of the Vite + Express decoupled setup.

---

## Internal Module Dependencies (apps/api)

```
src/server.ts                 → imports → src/root.ts, express, cors, dotenv
src/root.ts                   → imports → src/modules/manhwa/manhwa.router.ts, src/trpc.ts
src/trpc.ts                   → imports → @trpc/server, superjson
src/modules/manhwa/
  manhwa.router.ts             → imports → manhwa.service.ts, zod, src/trpc.ts
  manhwa.service.ts            → imports → manhwa.repository.ts, @manhwa-tracker/parser
  manhwa.repository.ts         → imports → @manhwa-tracker/database (db, manhwa, progress, sources, chapters), drizzle-orm
src/scripts/
  telegram-scan.ts             → imports → gramjs, dotenv, csv-writer
  telegram-import.ts           → imports → gramjs, @manhwa-tracker/database, dotenv
  import-from-enriched-csv.ts  → imports → @manhwa-tracker/database, csv-parse, dotenv
  fix-progress.ts              → imports → @manhwa-tracker/database, drizzle-orm, dotenv
```

## Internal Module Dependencies (apps/web)

```
src/main.tsx        → imports → src/App.tsx, src/providers.tsx
src/providers.tsx   → imports → src/lib/trpc.ts, @tanstack/react-query
src/App.tsx         → imports → src/pages/*, react-router-dom
src/lib/trpc.ts     → imports → @trpc/client, @trpc/react-query, superjson, apps/api type AppRouter

src/pages/Dashboard.tsx      → imports → src/lib/trpc.ts, src/components/ui/*
src/pages/Library.tsx        → imports → src/lib/trpc.ts, src/components/ui/*
src/pages/ManhwaDetail.tsx   → imports → src/lib/trpc.ts, src/components/ui/*, sonner, lucide-react
src/pages/AddManhwa.tsx      → imports → src/lib/trpc.ts, src/components/ui/*
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
  gramjs               → Telegram MTProto (scripts only)
  dotenv               → Env vars
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

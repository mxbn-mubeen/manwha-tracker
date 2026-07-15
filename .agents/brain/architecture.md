# Architecture — Manhwa Tracker

project_root: D:\manwha-tracker
last_updated: 2026-07-16

## Monorepo Structure (Actual as of 2026-07-16)

```
D:\manwha-tracker\
├── apps\
│   ├── api\          Express 4 + tRPC v11 — port 3001
│   │   ├── src\
│   │   │   ├── modules\
│   │   │   │   └── manhwa\
│   │   │   │       ├── manhwa.router.ts     tRPC routes
│   │   │   │       ├── manhwa.service.ts    business logic
│   │   │   │       └── manhwa.repository.ts DB access (plain select/join only)
│   │   │   ├── scripts\
│   │   │   │   ├── telegram-scan.ts         scan channels → CSV
│   │   │   │   ├── telegram-import.ts       live Telegram import
│   │   │   │   ├── telegram-import-from-csv.ts
│   │   │   │   ├── import-from-enriched-csv.ts
│   │   │   │   └── fix-progress.ts          backfill progress from latest chapter
│   │   │   ├── root.ts                      tRPC app router composition
│   │   │   ├── server.ts                    Express server entry
│   │   │   └── trpc.ts                      tRPC context + procedures
│   │   ├── manhwa-only.enriched.csv         219-row curated import CSV
│   │   └── package.json
│   └── web\          Vite 5 + React 19 — port 3000
│       ├── src\
│       │   ├── pages\
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Library.tsx
│       │   │   ├── ManhwaDetail.tsx
│       │   │   └── AddManhwa.tsx
│       │   ├── components\
│       │   │   └── ui\                      shadcn/ui components
│       │   ├── lib\
│       │   │   └── trpc.ts                  tRPC client + React Query setup
│       │   ├── providers.tsx                tRPC + QueryClient providers
│       │   ├── App.tsx                      router (react-router-dom v6)
│       │   └── main.tsx
│       └── package.json
├── libs\                          (was: packages\ — renamed for clarity)
│   ├── database\     Drizzle ORM schema + Neon client singleton
│   │   └── src\
│   │       ├── db.ts              neon() + drizzle() singleton
│   │       └── schema\
│   │           └── index.ts       manhwa, sources, chapters, progress, notifications, settings
│   ├── parser\       Chapter number + title extraction + site metadata parsing
│   └── shared\       Shared TypeScript types (minimal)
├── .agents\
│   └── brain\        Project brain files
├── package.json      PNPM workspaces root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Database Schema (Neon PostgreSQL via Drizzle ORM)

Driver: `drizzle-orm/neon-http` — **no relational queries, no transactions**

| Table | Key Columns |
|-------|-------------|
| manhwa | id, slug, title, cover_url, status (ongoing\|completed\|hiatus\|dropped), genres[], description, created_at, updated_at |
| sources | id, manhwa_id, type (telegram\|website), url, adapter_key, priority, is_active, created_at |
| chapters | id, manhwa_id, source_id, chapter_num (real), title, url, published_at, discovered_at |
| progress | id, manhwa_id (unique), chapter_id, last_read_at, is_completed |
| notifications | id, manhwa_id, chapter_id, type, sent_at, is_read |
| settings | id, key, value (jsonb), updated_at |

No user_id — single user app.

Relationships:
- manhwa → sources (1:many)
- manhwa → chapters (1:many)
- manhwa → progress (1:1, enforced by UNIQUE constraint on manhwa_id)
- chapters → notifications (1:many)

## API Architecture (apps/api)

Express app serving tRPC at `/trpc/*` with CORS configured for port 3000.

### tRPC Router (`manhwaRouter`)

| Endpoint | Type | Input | Description |
|---|---|---|---|
| `getAll` | query | — | All manhwa + progress + latest chapter (via subquery) + first source |
| `getById` | query | id (string\|number) | Single manhwa with full sources list |
| `create` | mutation | title, status?, coverUrl?, description?, genres?, lastChapter?, latestChapter? | Manual add |
| `addFromUrl` | mutation | url (string) | Scrape website + auto-create |
| `updateProgress` | mutation | manhwaId, chapter | Upsert progress row + create chapter if needed |
| `updateStatus` | mutation | id, status | Change ongoing/hiatus/completed/dropped |
| `addSource` | mutation | manhwaId, url, type | Add source to existing manhwa (normalises @channel) |
| `delete` | mutation | id (string\|number) | Delete manhwa (cascades to progress/chapters/sources) |

### Repository Rules (CRITICAL)

- ❌ `db.query.*` — NOT supported by neon-http (silently fails/hangs)
- ❌ `db.transaction()` — NOT supported by neon-http (throws at runtime)
- ✅ `db.select().from().leftJoin()` — use for all reads
- ✅ `db.insert().onConflictDoUpdate()` — use for all upserts
- ✅ Sequential plain inserts/updates — for multi-step writes (no atomicity guarantee)

## Frontend Architecture (apps/web)

React 19 + react-router-dom v6 SPA. All API calls go via tRPC hooks.

```
/ → redirect to /dashboard
/dashboard     Dashboard.tsx     Stats + Continue Reading + Recent Activity
/library       Library.tsx       Full grid of all manhwa
/manhwa/:id    ManhwaDetail.tsx  Detail: progress controls, status selector, sources, add source
/add           AddManhwa.tsx     Manual add form (title, status, chapters, cover, description)
```

tRPC client configured in `lib/trpc.ts` with SuperJSON transformer, connected to `http://localhost:3001/trpc`.

## Telegram Sync (apps/api/src/scripts/)

- GramJS MTProto personal account (API_ID + API_HASH in `apps/api/.env`)
- `telegram-scan.ts` — joins all channels, finds manhwa, exports CSV
- `telegram-import.ts` — live import from Telegram API
- `import-from-enriched-csv.ts` — imports from `manhwa-only.enriched.csv` (primary import)
- `fix-progress.ts` — one-time script to seed progress from latest chapter per manhwa

## Website Adapters (libs/parser)

Common interface: `parseMetadataFromUrl(url)`

| Site | Method |
|------|--------|
| AsuraScans | Cheerio HTML parse |
| Webtoon | Cheerio HTML parse |
| Reaper Scans | Cheerio HTML parse |
| manhuaus.com | Cheerio HTML parse |
| Generic | Basic fallback |

## Design Patterns Used

- Repository Pattern (db layer — class-based, in `manhwa.repository.ts`)
- Service Pattern (business logic — `manhwa.service.ts`)
- Adapter Pattern (website connectors in `libs/parser`)
- Singleton (Neon DB connection in `libs/database/src/db.ts`)
- Upsert Pattern (onConflictDoUpdate instead of transactions)

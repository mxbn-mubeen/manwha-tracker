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

## Website Adapters (libs/parser/src/adapters/)

Implements the `WebsiteAdapter` interface from `libs/shared/src/types/adapter.ts`
(`key`, `name`, `urlPatterns`, `detectTitle`, `latestChapter`, `chapterList`).

| Site | Adapter key | File |
|------|------------|------|
| AsuraScans | `asurascans` | `asurascans.ts` |
| Webtoon | `webtoon` | `webtoon.ts` |
| Reaper Scans | `reaperscans` | `reaperscans.ts` |
| manhuaus.com | `manhuaus` | `manhuaus.ts` |
| Generic (catch-all) | `generic` | `generic.ts` |

All adapters share `chapter-extract.ts`, which does a markup-agnostic scan of every
`<a>` tag on a page for text/href matching `chapter|ch|episode|ep <number>`, taking
the highest number found as the latest chapter. This is deliberately robust-but-approximate:
it works without knowing each site's exact CSS classes, at the cost of relying on
the site including chapter numbers in visible link text or hrefs.

`factory.ts` exposes:
- `detectAdapterKey(url)` — matches `urlPatterns` to pick a key, defaults to `'generic'`
- `getAdapter(adapterKey, url)` — resolves an adapter instance, preferring the stored
  `adapter_key` (so a manually-corrected key is respected) and falling back to URL detection

`libs/parser/src/metadata.ts` (`parseMetadataFromUrl`) is unchanged — used for the initial
title/cover/description scrape when adding a manhwa via `addFromUrl`, separate from chapter sync.

## Sync Flow (apps/api/src/modules/sync/)

Added 2026-07-21 to replace the placeholder "Sync" button (previously a `setTimeout` + toast).

- `sync.repository.ts` — `getActiveSources(type)`, `getMaxChapterNum(manhwaId)`, `insertChapter(...)`,
  `touchManhwaUpdatedAt(manhwaId)`. Plain select/join/insert only (same neon-http constraints as manhwa module).
- `sync.service.ts` — `SyncService.run(scope: 'telegram' | 'websites' | 'all')`:
  - For each active **website** source: resolves the adapter via `getAdapter`, calls `latestChapter(url)`,
    compares against the manhwa's current max chapter, inserts a new `chapters` row if higher, touches `updatedAt`.
  - For active **telegram** sources: not implemented yet — counted and surfaced as a skipped/error note
    (needs the GramJS download-watcher, see roadmap).
  - Per-source failures are caught individually so one bad source doesn't abort the whole run.
- `sync.router.ts` — `sync.run` tRPC mutation, input `{ scope }` (defaults `'all'`), no auth
  (single-user app; same trust model as the rest of the API).
- Frontend: `AppShell.tsx`'s Sync button calls `trpc.sync.run.useMutation()`, invalidates
  `manhwa.getAll` on success, and shows the real `newChapters`/`updatedManhwa`/`errors` in a toast.

Note: `libs/shared/src/schemas/sync.ts` already defined a `TriggerSyncSchema` with a `secret`
field for an external cron trigger (e.g. GitHub Actions) — that REST/secret-protected entrypoint
is still TODO; the `sync.run` tRPC mutation added here is for the in-app button only.

## Design Patterns Used

- Repository Pattern (db layer — class-based, in `manhwa.repository.ts`)
- Service Pattern (business logic — `manhwa.service.ts`)
- Adapter Pattern (website connectors in `libs/parser`)
- Singleton (Neon DB connection in `libs/database/src/db.ts`)
- Upsert Pattern (onConflictDoUpdate instead of transactions)

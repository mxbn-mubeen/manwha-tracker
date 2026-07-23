# Architecture — Manhwa Tracker

project_root: D:\manwha-tracker
last_updated: 2026-07-22

## Monorepo Structure (Actual as of 2026-07-22)

```
D:\manwha-tracker\
├── apps\
│   ├── api\          Express 4 + tRPC v11 — port 3001
│   │   ├── src\
│   │   │   ├── modules\
│   │   │   │   ├── manhwa\
│   │   │   │   │   ├── manhwa.router.ts          tRPC routes
│   │   │   │   │   ├── manhwa.service.ts         business logic
│   │   │   │   │   ├── manhwa.repository.ts      write operations (create/update/delete)
│   │   │   │   │   ├── manhwa.read.repository.ts read operations (getAll, getById + per-source stats)
│   │   │   │   │   ├── progress.repository.ts    progress upserts
│   │   │   │   │   └── sources.repository.ts     source CRUD + adapter key resolution
│   │   │   │   ├── sync\
│   │   │   │   │   ├── sync.router.ts
│   │   │   │   │   ├── sync.service.ts
│   │   │   │   │   └── sync.repository.ts
│   │   │   │   ├── settings\
│   │   │   │   │   └── settings.router.ts
│   │   │   │   └── telegram\
│   │   │   │       └── (telegram module files)
│   │   │   ├── scripts\
│   │   │   │   ├── backfill-covers.ts         backfills cover URLs via MangaDex
│   │   │   │   ├── cron-sync.ts               runs website sync loop
│   │   │   │   ├── telegram-download-watcher.ts  GramJS event-driven chapter + progress tracker
│   │   │   │   └── fix-db.ts                  one-off DB cleanup script
│   │   │   ├── env.ts                         loads .env from workspace root
│   │   │   ├── root.ts                        tRPC app router composition
│   │   │   ├── server.ts                      Express server entry
│   │   │   └── trpc.ts                        tRPC context + procedures
│   │   └── package.json
│   └── web\          Vite 5 + React 19 — port 3000
│       ├── src\
│       │   ├── features\                      Feature-based folder structure (NOT pages/)
│       │   │   ├── dashboard\
│       │   │   │   ├── Dashboard.tsx
│       │   │   │   └── components\
│       │   │   ├── manhwa\                    Library + AddManhwa
│       │   │   │   ├── Library.tsx
│       │   │   │   ├── AddManhwa.tsx
│       │   │   │   └── components\
│       │   │   │       └── ManhwaCard.tsx
│       │   │   ├── manhwa-detail\
│       │   │   │   ├── ManhwaDetail.tsx       (page entry - thin orchestrator)
│       │   │   │   └── components\
│       │   │   │       ├── ManhwaHeader.tsx   (title, ID, genres, status dropdown, description)
│       │   │   │       ├── ManhwaPoster.tsx   (cover image, continue reading, edit button)
│       │   │   │       ├── ProgressCard.tsx   (chapter progress controls)
│       │   │   │       ├── SourcesList.tsx    (sources list + add source form)
│       │   │   │       └── EditManhwaModal.tsx (edit title, cover, description, genres)
│       │   │   └── settings\
│       │   │       └── Settings.tsx
│       │   ├── components\
│       │   │   ├── layout\
│       │   │   │   └── AppShell.tsx           (navbar + layout)
│       │   │   └── ui\                        shadcn/ui components
│       │   ├── lib\
│       │   │   └── trpc.ts                    tRPC client + React Query setup
│       │   ├── providers.tsx                  tRPC + QueryClient providers
│       │   ├── App.tsx                        router (react-router-dom v6)
│       │   └── main.tsx
│       └── package.json
├── libs\                          (was: packages\ — renamed for clarity)
│   ├── database\     Drizzle ORM schema + Neon client singleton
│   │   └── src\
│   │       ├── db.ts              neon() + drizzle() singleton
│   │       └── schema\
│   │           └── index.ts       manhwa, sources, chapters, progress, settings
│   ├── parser\       Chapter extraction + site adapter + metadata parsing
│   │   └── src\
│   │       ├── adapters\
│   │       │   ├── sites\
│   │       │   │   ├── asurascans.ts
│   │       │   │   ├── webtoon.ts
│   │       │   │   ├── reaperscans.ts
│   │       │   │   ├── manhuaus.ts
│   │       │   │   └── generic.ts
│   │       │   ├── utils\
│   │       │   │   ├── extract-chapter-number.ts
│   │       │   │   └── chapter-extract.ts
│   │       │   ├── factory.ts
│   │       │   ├── http.ts
│   │       │   └── index.ts
│   │       └── metadata.ts
│   └── shared\       Shared TypeScript types (minimal — may be deprecated)
├── .agents\
│   └── brain\        Project brain files
├── .env              Shared workspace env (DATABASE_URL + Telegram creds)
├── .env.example
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
| notifications | (removed from schema — table was defined but never used anywhere) |
| settings | id, key, value (jsonb), updated_at |

No user_id — single user app.

Relationships:
- manhwa  - `sources` → `chapters` (1:N)
  - `manhwa` → `progress` (1:1), enforced by UNIQUE constraint on manhwa_id)
- chapters → notifications (1:many)

## API Architecture (apps/api)

Express app serving tRPC at `/trpc/*` with CORS configured for port 3000.

### tRPC Router (`manhwaRouter`)

| Endpoint | Type | Input | Description |
|---|---|---|---|
| `getAll` | query | — | All manhwa + progress + latest chapter (subquery) + first source |
| `getById` | query | id | Single manhwa + full sources list with per-source `latestChapterNum` + `lastDiscoveredAt` |
| `create` | mutation | title, status?, coverUrl?, description?, genres?, lastChapter?, latestChapter? | Manual add |
| `addFromUrl` | mutation | url | Scrape website + auto-create |
| `update` | mutation | id, title?, coverUrl?, description?, genres? | Edit manhwa metadata |
| `updateProgress` | mutation | manhwaId, chapter | Upsert progress row + create chapter if needed |
| `updateStatus` | mutation | id, status | Change ongoing/hiatus/completed/dropped |
| `updateLatestChapter` | mutation | id, chapterNum | Manually bump latest chapter |
| `addSource` | mutation | manhwaId, url, type | Add source (validates Telegram/website format, detects adapterKey) |
| `removeSource` | mutation | manhwaId, url | Remove a source row |
| `delete` | mutation | id | Delete manhwa (cascades to progress/chapters/sources) |
| `getTelegramCount` | query | — | Count of active Telegram sources |

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
/dashboard     features/dashboard/Dashboard.tsx     Stats + Continue Reading + Recent Activity
/library       features/manhwa/Library.tsx          Full grid, search, status filter (All/Reading/Unread/Completed/Hiatus/Dropped)
/manhwa/:id    features/manhwa-detail/ManhwaDetail  Detail: progress, status dropdown, ID badge, sources with per-source status badge, edit
/add           features/manhwa/AddManhwa.tsx        Manual add form (title, status, chapters, cover, genres, description)
/settings      features/settings/Settings.tsx       Settings page
```

Note: There is NO `src/pages/` directory. All pages live inside `src/features/` as the main file at the feature root.

tRPC client configured in `lib/trpc.ts` with SuperJSON transformer, connected to `http://localhost:3001/trpc`.

## Telegram Sync (apps/api/src/scripts/)

- `bot/` (Telegram Alert Bot Service)
  - `index.ts`: Entry point.
  - `poll.ts`: Long-polling loop and update dispatcher.
  - `handlers.ts`: Command and forward-message handlers.
  - `api.ts`: Bot API HTTP helpers.
- `watcher/` (Telegram Download Watcher)
  - `index.ts`: Entry point, client setup, and event wiring.
  - `session.ts`: Session management and death alerts.
  - `channel-map.ts`: Channel mapping and access hash resolution.
  - `handlers.ts`: New message and read update handlers.
- `cron-sync.ts` — runs website adapter sync loop for all website sources

⚠️ Scripts that DO NOT EXIST (were in brain/roadmap but were never written): `telegram-scan.ts`, `telegram-import.ts`, `telegram-import-from-csv.ts`, `import-from-enriched-csv.ts`, `fix-progress.ts`

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

All adapters share- `extractChapterNumber(title/url)` — extracts the chapter number from strings (e.g. "Chapter 42" -> 42).
  It includes robust filtering for slugs, removes common outliers (years, resolutions, dates), and caps
  the extracted number at reasonable limits to prevent false positives from cross-promotion ads.r found as the latest chapter. This is deliberately robust-but-approximate:
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
  - For active **telegram** sources: `sync.run` skips fetching chapters for Telegram. Telegram sync is handled separately and asynchronously by the standalone GramJS watcher process (`watcher/index.ts`), not by this synchronous API call.
  - Per-source failures are caught individually so one bad source doesn't abort the whole run.
- `sync.router.ts` — `sync.run` tRPC mutation, input `{ scope }` (defaults `'all'`), no auth
  (single-user app; same trust model as the rest of the API).
- Frontend: `AppShell.tsx`'s Sync button calls `trpc.sync.run.useMutation()`, invalidates
  `manhwa.getAll` on success, and shows the real `newChapters`/`updatedManhwa`/`errors` in a toast.

Note: `libs/shared/src/schemas/sync.ts` already defined a `TriggerSyncSchema` with a `secret`
field for an external cron trigger (e.g. GitHub Actions) — that REST/secret-protected entrypoint
is still TODO; the `sync.run` tRPC mutation added here is for the in-app button only.

## Settings Module (apps/api/src/modules/settings/)

Added to support a `/settings` page in the frontend. Persists key/value pairs in the `settings` table (jsonb value column).
- `settingsRouter` exported and registered in `root.ts` as `settings`.

## Telegram Module (apps/api/src/modules/telegram/)

Houses the repository and service used by `telegram-download-watcher.ts` for DB operations (insertChapter, findChapter, markAsReadIfNewer, touchManhwaUpdatedAt, getActiveTelegramSources).

## Design Patterns Used

- Repository Pattern (db layer — class-based, split into `manhwa.read.repository.ts` + `manhwa.repository.ts` + `sources.repository.ts` + `progress.repository.ts`)
- Service Pattern (business logic — `manhwa.service.ts`)
- Adapter Pattern (website connectors in `libs/parser`)
- Singleton (Neon DB connection in `libs/database/src/db.ts`)
- Upsert Pattern (onConflictDoUpdate instead of transactions)
- Client-side Status Derivation (per-source Leading/Synced/Behind computed in SourcesList.tsx from API data)

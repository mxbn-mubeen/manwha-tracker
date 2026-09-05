# Architecture — Manhwa Tracker

project_root: F:\manwha-tracker
last_updated: 2026-08-31

## Monorepo Structure (Actual as of 2026-08-28)

The project split the original single `apps/api` into two separate apps: a
lightweight `apps/api` (fast tRPC queries, deployed to Vercel Serverless) and
a long-running `apps/worker` (Telegram watcher, Telegram bot, website sync —
deployed as a Docker service). `apps/web` is unchanged.

manwha-tracker/
├── .agents/
│   └── brain/                Project brain files
├── .github/
│   └── workflows/
│       ├── ci.yml            CI workflow
│       ├── keep-alive.yml    Keeps Render worker alive
│       └── sync-cron.yml     GitHub Actions cron for website sync
├── apps/
│   ├── api/                  Express 4 + tRPC v11 — port 3001 (Vercel Serverless)
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── manhwa/
│   │   │   │   │   ├── manhwa.read.repository.ts
│   │   │   │   │   ├── manhwa.repository.ts
│   │   │   │   │   ├── manhwa.router.ts
│   │   │   │   │   ├── manhwa.service.ts
│   │   │   │   │   ├── progress.repository.ts
│   │   │   │   │   └── sources.repository.ts
│   │   │   │   ├── settings/
│   │   │   │   │   ├── settings.router.ts
│   │   │   │   │   └── telegram-auth.procedures.ts
│   │   │   │   ├── stats/
│   │   │   │   │   └── stats.router.ts
│   │   │   │   ├── sync/
│   │   │   │   │   ├── sync.router.ts
│   │   │   │   │   └── sync.service.ts
│   │   │   │   └── telegram/
│   │   │   │       └── telegram.repository.ts
│   │   │   ├── routes/
│   │   │   │   ├── health.ts
│   │   │   │   └── proxy.ts
│   │   │   ├── types/
│   │   │   │   └── input.d.ts
│   │   │   ├── utils/
│   │   │   │   ├── telegram-client.ts
│   │   │   │   └── trpc-error.ts
│   │   │   ├── env.ts
│   │   │   ├── root.ts
│   │   │   ├── server.ts
│   │   │   ├── trpc.ts
│   │   │   └── vercel.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vercel.json
│   ├── web/                  Vite 5 + React 19 — port 3000
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   └── AppShell.tsx
│   │   │   │   └── ui/       shadcn/ui components (badge, button, card, input, sheet, tabs)
│   │   │   ├── features/
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── ContinueReading.tsx
│   │   │   │   │   │   ├── RecentActivity.tsx
│   │   │   │   │   │   └── StatCard.tsx
│   │   │   │   │   └── Dashboard.tsx
│   │   │   │   ├── manhwa/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── AddManhwaForm.tsx
│   │   │   │   │   │   └── ManhwaCard.tsx
│   │   │   │   │   ├── AddManhwa.tsx
│   │   │   │   │   └── Library.tsx
│   │   │   │   ├── manhwa-detail/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── EditManhwaModal.tsx
│   │   │   │   │   │   ├── ManageChaptersSection.tsx
│   │   │   │   │   │   ├── ManhwaHeader.tsx
│   │   │   │   │   │   ├── ManhwaPoster.tsx
│   │   │   │   │   │   ├── ProgressCard.tsx
│   │   │   │   │   │   ├── SourceStatusBadge.tsx
│   │   │   │   │   │   ├── SourcesList.tsx
│   │   │   │   │   │   └── UnreadManhwaStrip.tsx
│   │   │   │   │   └── ManhwaDetail.tsx
│   │   │   │   ├── search/
│   │   │   │   │   └── GlobalSearch.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── RecentlyDeletedSection.tsx
│   │   │   │   │   │   ├── SyncHistorySection.tsx
│   │   │   │   │   │   ├── SystemSection.tsx
│   │   │   │   │   │   ├── TelegramLoginWizard.tsx
│   │   │   │   │   │   └── TelegramSection.tsx
│   │   │   │   │   └── Settings.tsx
│   │   │   │   ├── sources/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── FixAdapterKeysButton.tsx
│   │   │   │   │   │   ├── SourceCard.tsx
│   │   │   │   │   │   ├── SourceRow.tsx
│   │   │   │   │   │   ├── SourcesPanels.tsx
│   │   │   │   │   │   ├── TelegramPanel.tsx
│   │   │   │   │   │   └── WebsiteFilterPanel.tsx
│   │   │   │   │   ├── utils/
│   │   │   │   │   │   ├── adapterColors.ts
│   │   │   │   │   │   └── sourceHelpers.ts
│   │   │   │   │   └── SourcesPage.tsx
│   │   │   │   ├── stats/
│   │   │   │   │   └── StatsPage.tsx
│   │   │   │   └── sync/
│   │   │   │       ├── RunCard.tsx
│   │   │   │       └── SyncHistoryDrawer.tsx
│   │   │   ├── lib/
│   │   │   │   ├── trpc.ts
│   │   │   │   ├── usePageTitle.ts
│   │   │   │   └── utils.ts
│   │   │   ├── utils/
│   │   │   │   └── image.ts
│   │   │   ├── App.tsx
│   │   │   ├── index.css
│   │   │   ├── main.tsx
│   │   │   └── providers.tsx
│   │   ├── .env.example
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vercel.json
│   │   └── vite.config.ts
│   └── worker/                 Express 4 — port 3002 (Docker service, Render)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── manhwa/
│       │   │   │   ├── manhwa.read.repository.ts
│       │   │   │   ├── manhwa.repository.ts
│       │   │   │   ├── manhwa.service.ts
│       │   │   │   ├── progress.repository.ts
│       │   │   │   └── sources.repository.ts
│       │   │   ├── settings/
│       │   │   ├── sync/
│       │   │   │   ├── sync.processor.ts
│       │   │   │   ├── sync.service.ts
│       │   │   │   ├── sync.utils.ts
│       │   │   │   └── sync.website.ts
│       │   │   └── telegram/
│       │   │       └── telegram.repository.ts
│       │   ├── scripts/
│       │   │   ├── bot/
│       │   │   │   ├── api.ts
│       │   │   │   ├── channel-registration.ts
│       │   │   │   ├── handlers.ts
│       │   │   │   ├── index.ts
│       │   │   │   └── poll.ts
│       │   │   ├── cron/
│       │   │   │   └── cron-sync.ts
│       │   │   └── watcher/
│       │   │       ├── channel-map.ts
│       │   │       ├── handlers.ts
│       │   │       ├── index.ts
│       │   │       ├── intervals.ts
│       │   │       ├── reconcile.ts
│       │   │       └── session.ts
│       │   ├── utils/
│       │   │   ├── bot-alert.ts
│       │   │   └── telegram-client.ts
│       │   ├── env.ts
│       │   └── server.ts
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
├── libs/
│   ├── database/
│   │   ├── src/
│   │   │   ├── migrations/
│   │   │   ├── schema/
│   │   │   │   └── index.ts
│   │   │   ├── db.ts
│   │   │   ├── index.ts
│   │   │   ├── settings.repository.ts
│   │   │   └── sync.repository.ts
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── parser/
│   │   ├── src/
│   │   │   ├── adapters/
│   │   │   │   ├── sites/
│   │   │   │   │   ├── arenascans.ts
│   │   │   │   │   ├── asurascans.ts
│   │   │   │   │   ├── comixto.ts
│   │   │   │   │   ├── generic.ts
│   │   │   │   │   ├── infinitelevelup.ts
│   │   │   │   │   ├── manhuaus.ts
│   │   │   │   │   ├── mgeko.ts
│   │   │   │   │   ├── mgread.ts
│   │   │   │   │   ├── reaperscans.ts
│   │   │   │   │   ├── roliascan.ts
│   │   │   │   │   ├── thunderscans.ts
│   │   │   │   │   ├── ultimateofallages.ts
│   │   │   │   │   ├── vortexscans.ts
│   │   │   │   │   └── webtoon.ts
│   │   │   │   ├── utils/
│   │   │   │   │   ├── chapter-extract.ts
│   │   │   │   │   ├── derive-slug.ts
│   │   │   │   │   ├── detect-title.ts
│   │   │   │   │   ├── drop-outliers.ts
│   │   │   │   │   ├── extract-chapter-number.ts
│   │   │   │   │   └── extract-declared-count.ts
│   │   │   │   ├── browser.ts
│   │   │   │   ├── esm-interop.ts
│   │   │   │   ├── factory.ts
│   │   │   │   ├── http.ts
│   │   │   │   └── index.ts
│   │   │   ├── cover-lookup.ts
│   │   │   ├── index.ts
│   │   │   └── metadata.ts
│   │   ├── package.json
│   │   ├── scratch.js
│   │   └── tsconfig.json
│   ├── shared/
│   │   ├── src/
│   │   │   ├── schemas/
│   │   │   │   ├── manhwa.ts
│   │   │   │   ├── progress.ts
│   │   │   │   └── sync.ts
│   │   │   ├── types/
│   │   │   │   ├── adapter.ts
│   │   │   │   ├── chapter.ts
│   │   │   │   ├── manhwa.ts
│   │   │   │   ├── notification.ts
│   │   │   │   ├── progress.ts
│   │   │   │   ├── source.ts
│   │   │   │   └── sync.ts
│   │   │   ├── constants.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ui/
│   │   └── package.json
│   └── utils/
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── turbo.json
```

## Database Schema (Neon PostgreSQL via Drizzle ORM)

Driver: `drizzle-orm/neon-http` — **no relational queries, no transactions**

| Table | Key Columns |
|-------|-------------|
| manhwa | id, slug, title, cover_url, status (ongoing\|completed\|hiatus\|dropped), genres[], description, created_at, updated_at, deleted_at |
| sources | id, manhwa_id, type (telegram\|website), url, adapter_key, priority, is_active, created_at, telegram_entity_id (unique), telegram_access_hash, telegram_entity_type |
| chapters | id, manhwa_id, source_id, chapter_num (real), title, url, published_at, discovered_at |
| progress | id, manhwa_id (unique), chapter_id, last_read_at, is_completed |
| settings | id, key (unique), value (jsonb), updated_at |
| sync_runs | id, scanned_sources, new_chapters, updated_manhwa, skipped_telegram, errors (jsonb), rows (jsonb), duration, run_at |

No user_id — single user app. There is no `notifications` table in the current schema.

Relationships:
- `manhwa` → `sources` → `chapters` (1:N)
- `manhwa` → `progress` (1:1), enforced by UNIQUE constraint on manhwa_id
- `manhwa.deleted_at` supports soft delete (`delete()`/`recover()`/`getDeleted()` on `ManhwaService`)

## API Architecture (apps/api) — fast queries only

Express app serving tRPC at `/trpc/*` with CORS reflecting the request origin. Deployed as a
Vercel Serverless Function in production (`vercel.ts`); `server.ts` is the local-dev entry point.

This app does **not** start the Telegram watcher, the Telegram bot, or the website-sync loop —
those all live on `apps/worker`. `apps/api` only handles operations fast enough for a serverless
function's timeout.

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
| `delete` | mutation | id | Soft-delete manhwa (sets deleted_at) |
| `recover` | mutation | id | Undo a soft delete |
| `getDeleted` | query | — | List soft-deleted manhwa |
| `getTelegramCount` | query | — | Count of active Telegram sources |
| `getChapters` | query | manhwaId | List discovered chapters for a manhwa |
| `deleteChapter` | mutation | id | Delete a single chapter row |

### `statsRouter`

| Endpoint | Type | Description |
|---|---|---|
| `getOverview` | query | Aggregated library metrics (total, unread counts, status breakdowns, sources distribution) |

### `syncRouter`

| Endpoint | Type | Description |
|---|---|---|
| `getHistory` | query | Last 20 `sync_runs` rows, newest first |
| `isSyncing` | query | Reads a DB-backed lock (`sys_is_syncing` setting) shared with the worker |
| `run` | mutation | **Stub only** — throws `NOT_IMPLEMENTED`. Exists so the frontend gets TypeScript types; the frontend's tRPC `splitLink` routes the actual call to the worker instead (see Sync Flow below) |

### `settingsRouter`

Key/value settings (`get`/`set`/`delete`, blocked for `telegram_session`) plus an in-app
Telegram login flow: `startTelegramLogin` (send OTP) → `verifyTelegramCode` (verify OTP, handles
2FA via `teleproto/Password`'s `computeCheck`) → session saved to the `settings` table. Also
`telegramStatus` (tests the saved session live against Telegram) and `disconnectTelegram`
(the only path allowed to delete `telegram_session`).

### Repository Rules (CRITICAL — applies to both apps/api and apps/worker)

- ❌ `db.query.*` — NOT supported by neon-http (silently fails/hangs)
- ❌ `db.transaction()` — NOT supported by neon-http (throws at runtime)
- ✅ `db.select().from().leftJoin()` — use for all reads
- ✅ `db.insert().onConflictDoUpdate()` — use for all upserts
- ✅ Sequential plain inserts/updates — for multi-step writes (no atomicity guarantee)

## Worker Architecture (apps/worker) — long-running jobs

Separate Express app (port 3002 locally; Docker container, e.g. Render, in production). Deliberately
has **no cross-app imports** from `apps/api` — its `modules/manhwa`, `modules/sync`, `modules/settings`,
and `modules/telegram` are worker-local copies of the same file layout, not shared code, so the worker
can be deployed independently of the API.

`server.ts` responsibilities:
- Starts the Telegram watcher (`scripts/watcher`) when `TELEGRAM_API_ID` is set and
  `START_TELEGRAM_WATCHER` isn't disabled.
- Starts the Telegram bot (`scripts/bot/poll.ts`) when `TELEGRAM_BOT_TOKEN` is set and
  `START_TELEGRAM_BOT` isn't disabled.
- Exposes exactly one tRPC-compatible route: `POST /trpc/sync.run`, guarded by a constant-time
  comparison against `APP_SECRET` (header `x-app-secret`). It hand-rolls the tRPC batch response
  shape so the frontend client doesn't need special-casing.
- `GET /health` for uptime checks.

### Telegram Watcher (`scripts/watcher/`)

Uses `teleproto` (not GramJS — see Dependencies note below), event-driven with several recovery
layers:
- **Connection**: `connectionRetries: -1`, 2s retry delay, 60s timeout — survives transient network drops.
- **Health check**: `getMe()` every 5 minutes; 3 consecutive failures triggers a full client rebuild.
- **Activity watchdog**: rebuilds the client if no watcher activity in 45 minutes.
- **Scheduled rebuild**: proactively recreates the client every 3 hours.
- **Reconciliation** (`reconcile.ts`): runs every 5 minutes independent of the live event stream —
  calls `getDialogs()`/`getMessages()` and reconciles against the DB. This is the mechanism that
  catches reads/messages missed during a disconnect. `teleproto`'s installed version does not
  support a `catchUp` constructor option (unlike GramJS) — reconciliation is the intended
  replacement for that, not a stopgap.
- Entity caching: `sources.telegram_entity_id` / `telegram_access_hash` / `telegram_entity_type`
  are populated once via `getEntity()` and reused thereafter via `InputPeer` construction, avoiding
  repeated username resolution (which is tightly FloodWait-limited).

### Telegram Bot (`scripts/bot/`)

Long-polling Bot API service (separate from the MTProto watcher). Supports `/start`, `/help`,
`/cancel`, `/list`, `/create <title>`, `/latest <id> <chapter>`, `/read <id> <chapter>`, plus a
forward-a-channel-message flow to register a new Telegram source (with a `/replace` vs `/cancel`
prompt if the manhwa already has one).

### Website Sync (`scripts/cron/cron-sync.ts` + `modules/sync/`)

- `sync.repository.ts` — `getActiveSources(type)`, `getMaxChapterNum(manhwaId)`, `insertChapter(...)`,
  `touchManhwaUpdatedAt(manhwaId)`. Plain select/join/insert only (same neon-http constraints as
  the manhwa module).
- `sync.service.ts` — `SyncService.run(scope: 'telegram' | 'websites' | 'all')`:
  - For each active **website** source: resolves the adapter via `getAdapter`, calls
    `latestChapter(url)` (max 60s), compares against the manhwa's current max chapter, inserts a new
    `chapters` row if higher, touches `updatedAt`.
  - **Telegram** sources are skipped by `sync.run` entirely — Telegram sync is handled
    asynchronously by the standalone watcher process, not by this call.
  - Wakes FlareSolverr (if configured) before syncing, since it sleeps when idle.
  - Per-source failures are caught individually so one bad source doesn't abort the whole run.
  - Writes a row to `sync_runs` per invocation (see Database Schema) for the frontend's sync-history UI.
- `cron-sync.ts` is the entry point invoked by `pnpm run cron:sync` (called from
  `.github/workflows/sync-cron.yml` on a 30-minute schedule) — runs one full sync and exits.
- The worker's `POST /trpc/sync.run` route (see above) is the path the in-app "Sync" button uses;
  the GitHub Actions cron and the button both end up calling the same `SyncService.run`.

## Frontend Architecture (apps/web)

React 19 + react-router-dom v6 SPA. All API calls go via tRPC hooks.

```
/ → redirect to /dashboard
/dashboard     features/dashboard/Dashboard.tsx     Stats + Continue Reading + Recent Activity
/library       features/manhwa/Library.tsx          Full grid, search, status filter (All/Reading/Unread/Completed/Hiatus/Dropped)
/add           features/manhwa/AddManhwa.tsx        Manual add form (title, status, chapters, cover, genres, description)
/manhwa/:id    features/manhwa-detail/ManhwaDetail  Detail: progress, status dropdown, ID badge, sources with per-source status badge, edit
/stats         features/stats/StatsPage.tsx         Library stats dashboard with charts and aggregate metrics
/settings      features/settings/Settings.tsx       Settings page (Telegram login, sync history, recently deleted)
```

Note: There is NO `src/pages/` directory. All pages live inside `src/features/` as the main file at
the feature root.

`lib/trpc.ts` uses a `splitLink`: most procedures go to `VITE_API_URL` (the Vercel API), but
`sync.run` specifically is routed to `VITE_SYNC_URL` (the worker's `POST /trpc/sync.run`), since
that's the only procedure the API's stub can't actually perform.

## Website Adapters (libs/parser/src/adapters/)

Implements the `WebsiteAdapter` interface from `libs/shared/src/types/adapter.ts`
(`key`, `name`, `urlPatterns`, `detectTitle`, `latestChapter`, `chapterList`). `key` is typed as
plain `string` — nothing enforces that adapter keys match `ADAPTER_KEYS` in
`libs/shared/src/constants.ts`, so that list needs to be kept in sync by hand (fixed 2026-08-28,
see decisions.md).

| Site | Adapter key | Needs browser rendering? |
|------|------------|------|
| Arena Scans | `arenascans` | no |
| AsuraScans | `asurascans` | yes (Playwright/FlareSolverr) |
| Comix.to | `comixto` | yes |
| manhuaus.com | `manhuaus` | no |
| Mgeko | `mgeko` | yes |
| Reaper Scans | `reaperscans` | no |
| RoliaScan | `roliascan` | yes |
| Thunder Scans | `thunderscans` | no |
| Ultimate of All Ages | `ultimateofallages` | yes |
| Webtoon | `webtoon` | no |
| Generic (catch-all) | `generic` | no |

Adapters needing browser rendering use `browser.ts`. The rendering stack (as of 2026-08-31):
1. **FlareSolverr** — tried first if `FLARESOLVERR_URL` env var is set. A 503 or non-200 response
   is treated as a failure and falls through to the next layer.
2. **Playwright headless browser** (`browser.ts` — `fetchRenderedHtml`) — tried if FlareSolverr
   fails or is not configured. Shares a single browser instance across requests.
3. **Hard failure** — throws `CloudflareBlockedError` with a user-readable reason.

The `looksLikeCloudflareChallenge(html)` helper gates both layers — if the initial HTTP fetch
returns a Cloudflare interstitial page, the fallback chain starts. If a 503 comes back from
FlareSolverr, it triggers the Playwright fallback. Playwright timeouts (30s) map to a
user-friendly "Site took too long to respond" message.

Chapter-number extraction (`extractChapterNumber`, `drop-outliers.ts`, `extract-declared-count.ts`)
has several layers of false-positive protection — DOM-order awareness, outlier filtering, and
cross-checking against a declared chapter count — specifically to prevent a sidebar/trending widget
on the page from being mistaken for the tracked series' own latest chapter.

`factory.ts` exposes:
- `detectAdapterKey(url)` — matches `urlPatterns` to pick a key, defaults to `'generic'`
- `getAdapter(adapterKey, url)` — resolves an adapter instance, preferring the stored
  `adapter_key` (so a manually-corrected key is respected) and falling back to URL detection

`libs/parser/src/metadata.ts` (`parseMetadataFromUrl`) is used for the initial title/cover/description
scrape when adding a manhwa via `addFromUrl`, separate from chapter sync.

`libs/parser/src/cover-lookup.ts` uses MangaDex's public API purely as a cover-image index (never as
a chapter source) for manual "Add Manhwa" entries and Telegram-only sources that have no website
source to scrape a cover from.

## Design Patterns Used

- Repository Pattern (db layer — class-based):
  - `SettingsRepository` — **canonical copy in `@manhwa-tracker/database`**, imported by both `apps/api` and `apps/worker`
  - `manhwa.read.repository.ts` + `manhwa.repository.ts` + `sources.repository.ts` + `progress.repository.ts` + `telegram.repository.ts` — **duplicated** between `apps/api` and `apps/worker` because these are tightly coupled to each app's business logic and keeping them separate avoids cross-app imports
  - `sync.repository.ts` — duplicated (same reason); the API copy backs the read-only `getHistory`/`isSyncing` queries; the worker copy backs the full `SyncService.run()`
- Service Pattern (business logic — `manhwa.service.ts`, `sync.service.ts`):
  - `apps/api/src/modules/sync/sync.service.ts` — **read-only**: only `getIsSyncing()` and `getSyncHistory()`
  - `apps/worker/src/modules/sync/sync.service.ts` — **full**: `SyncService.run()` + the above read helpers
- Adapter Pattern (website connectors in `libs/parser`)
- Singleton (Neon DB connection in `libs/database/src/db.ts`)
- Upsert Pattern (onConflictDoUpdate instead of transactions)
- Client-side Status Derivation (per-source Leading/Synced/Behind computed in SourcesList.tsx from API data)

## Dependencies Worth Knowing

- Telegram MTProto library is **`teleproto`**, not GramJS — older docs/comments in this repo may
  still say GramJS; that's stale, not a second library in use.
- `apps/api` and `apps/worker` deliberately do not import from each other. Shared code lives in
  `libs/` (`database`, `parser`, `shared`, `ui`, `utils`). `SettingsRepository` was moved to
  `@manhwa-tracker/database` as it is truly stateless and used identically in both apps.
  Domain-specific repositories (manhwa, sync, telegram) remain duplicated per-app.
- `big-integer` is required by `apps/worker` (teleproto's BigInt entity handling) — added to
  `apps/worker/package.json` 2026-08-28.

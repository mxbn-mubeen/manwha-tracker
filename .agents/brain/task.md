# Task List — Manhwa Tracker

Last updated: 2026-08-28

---

## Completed ✅

- [x] Create project brain (master-memory, architecture, decisions, patterns, mistakes, dependency-graph, roadmap)
- [x] Create monorepo scaffold (pnpm-workspace.yaml, turbo.json, tsconfig.base.json, package.json, README.md, .gitignore)
- [x] Scaffold `@manhwa-tracker/database` (Drizzle schema: manhwa, sources, chapters, progress, settings, sync_runs)
- [x] Scaffold `@manhwa-tracker/parser` (chapter extraction + site adapters + metadata parsing + cover lookup)
- [x] Scaffold `apps/api` — Express + tRPC server (port 3001)
- [x] Scaffold `apps/web` — Vite + React 19 (port 3000)
- [x] Implement tRPC client in web with SuperJSON transformer
- [x] Build Dashboard page (stats, Continue Reading, Recent Activity)
- [x] Build Library page (grid, search, status filters)
- [x] Build ManhwaDetail page (progress controls, status selector, sources, add source form)
- [x] Build AddManhwa page (manual add with title, status, chapters, cover, description)
- [x] Connect Drizzle to Neon PostgreSQL (neon-http driver)
- [x] Fix Neon HTTP driver constraints — remove relational API + transaction usage everywhere
- [x] Implement CRUD endpoints: getAll, getById, create, addFromUrl, updateProgress, updateStatus,
      updateLatestChapter, addSource, removeSource, delete, recover, getDeleted, getChapters,
      deleteChapter, getTelegramCount
- [x] Wire up Add Source form on detail page
- [x] Fix progress upsert (onConflictDoUpdate instead of update)
- [x] Wire up "Sync" button in navbar (real tRPC mutation, real result counts/errors in toast)
- [x] Build 10 real per-site website adapters (AsuraScans, Webtoon, Reaper Scans, manhuaus.com,
      Arena Scans, Comix.to, Mgeko, RoliaScan, Thunder Scans, Ultimate of All Ages) + generic
      fallback, in `libs/parser/src/adapters/sites/`
- [x] Add `detectAdapterKey`/`getAdapter` factory
- [x] Add browser-rendering fallback (`browser.ts`, Playwright/FlareSolverr) for Cloudflare-protected
      adapters (AsuraScans, Comix.to, Mgeko, RoliaScan, Ultimate of All Ages)
- [x] Add chapter-extraction false-positive protections (DOM-order awareness, outlier filtering,
      declared-count cross-check) after a confirmed bad sync (see decisions.md, 2026-07-21 entry)
- [x] Add cover-art lookup via MangaDex's public API (`libs/parser/src/cover-lookup.ts`) — image
      index only, wired into manual "Add Manhwa" with og:image fallback
- [x] Add soft delete for manhwa (`deleted_at` column, `delete`/`recover`/`getDeleted`)
- [x] Add sync history (`sync_runs` table, `sync.getHistory`/`sync.isSyncing`, Settings drawer UI)
- [x] Telegram download-watcher (`apps/worker/src/scripts/watcher/`) — event-driven (new message +
      read update) plus periodic reconciliation, health-check rebuild, activity watchdog, and
      scheduled rebuild. Verified live in production.
- [x] Telegram alert bot (`apps/worker/src/scripts/bot/`) — `/start`, `/help`, `/cancel`, `/list`,
      `/create`, `/latest`, `/read`, plus forward-to-register with `/replace`/`/cancel` conflict flow
- [x] GitHub Actions cron worker (`.github/workflows/sync-cron.yml`) — runs the website sync on a
      30-minute schedule directly against Neon via `DATABASE_URL` secret
- [x] Split `apps/api` into `apps/api` (fast queries, Vercel Serverless) and `apps/worker`
      (long-running: watcher, bot, sync) — no cross-app imports; each has its own module copies
- [x] Fixed `.github/workflows/sync-cron.yml` and `apps/api`/`apps/worker` `package.json` scripts,
      which still pointed at `apps/api` for the cron/watcher/bot scripts after the split moved those
      files to `apps/worker` (2026-08-28)
- [x] Fixed `ADAPTER_KEYS` in `libs/shared/src/constants.ts` — had stale entries (`mangadex`,
      `flamecomics`) that don't correspond to real website adapters and was missing 6 real ones
      (`generic`, `arenascans`, `comixto`, `mgeko`, `roliascan`, `thunderscans`, `ultimateofallages`)
      (2026-08-28)

---

## In Progress / Next 🔲

- [ ] `libs/parser/src/adapters/sites/*.ts` `key` field is typed as plain `string`, not the
      `AdapterKey` union from `libs/shared/src/constants.ts` — nothing currently enforces the two
      stay in sync. Worth typing `key: AdapterKey` on the `WebsiteAdapter` interface so a future
      drift like the one just fixed would be a compile error instead of silent.
- [ ] `apps/web/package.json` lists `zustand` as a dependency but nothing in `apps/web/src` imports
      it — confirm whether it's dead weight to remove or whether some planned feature still needs it.
- [ ] Confirm `pnpm run build --filter worker` and `working-directory: apps/worker` actually succeed
      in GitHub Actions now that the workflow was repointed away from `apps/api` — the fix was made
      from the zip's contents, not verified against a live Actions run yet.

---

## Future 📋

- [ ] Chrome Extension (MV3) — detect page + chapter, POST to API
- [ ] Analytics / Statistics page
- [ ] PWA support
- [ ] AI recommendations
- [ ] Backup / Restore
- [ ] Offline mode

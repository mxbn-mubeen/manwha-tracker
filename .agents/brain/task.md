# Task List — Manhwa Tracker

Last updated: 2026-07-16

---

## Completed ✅

- [x] Create project brain (master-memory, architecture, decisions, patterns, mistakes, dependency-graph, roadmap)
- [x] Create monorepo scaffold (pnpm-workspace.yaml, turbo.json, tsconfig.base.json, package.json, README.md, .gitignore)
- [x] Scaffold `@manhwa-tracker/database` (Drizzle schema: manhwa, sources, chapters, progress, notifications, settings)
- [x] Scaffold `@manhwa-tracker/parser` (chapter extraction + site metadata parsing)
- [x] Scaffold `apps/api` — Express + tRPC server (port 3001)
- [x] Scaffold `apps/web` — Vite + React 19 (port 3000)
- [x] Implement tRPC client in web with SuperJSON transformer
- [x] Build Dashboard page (stats, Continue Reading, Recent Activity)
- [x] Build Library page (grid, search)
- [x] Build ManhwaDetail page (progress controls, status selector, sources, add source form)
- [x] Build AddManhwa page (manual add with title, status, chapters, cover, description)
- [x] Connect Drizzle to Neon PostgreSQL (neon-http driver)
- [x] Fix Neon HTTP driver constraints — remove relational API + transaction usage everywhere
- [x] Import 214 manhwa from `manhwa-only.enriched.csv`
- [x] Seed reading progress for all 214 manhwa from CSV LatestChapter column
- [x] Implement all CRUD endpoints: getAll, getById, create, addFromUrl, updateProgress, updateStatus, addSource, delete
- [x] Fix all hardcoded UI data in ManhwaDetail (sources, author, description, chapter counts)
- [x] Wire up Add Source form on detail page
- [x] Fix progress upsert (onConflictDoUpdate instead of update)
- [x] Wire up "Sync" button in navbar (visual feedback + toast)
- [x] Library search/filter — filter by status ("Reading", "Completed", "Hiatus") now working perfectly
- [x] Fix CodeRabbit review issues (idempotent DB logic, schema constraints, strict Zod IDs, defensive rendering, API error states)
- [x] Build per-site website adapters (AsuraScans, Webtoon, Reaper Scans, manhuaus.com) + generic fallback in `libs/parser/src/adapters/`
- [x] Add `detectAdapterKey`/`getAdapter` factory; fix `addFromUrl` and `addSource` to use it (previously used mismatched ad-hoc keys)
- [x] Add `apps/api/src/modules/sync/` (repository/service/router) with a real `sync.run` tRPC mutation
- [x] Wire the navbar "Sync" button to `trpc.sync.run`, invalidate `manhwa.getAll` on success, show real result counts/errors in toast

---

## In Progress / Next 🔲

- [ ] Clean up duplicate chapter entries in database to unblock Drizzle schema push (needs live DB access)
- [ ] Re-write the missing Telegram scripts (telegram-scan.ts, telegram-import.ts, telegram-import-from-csv.ts, import-from-enriched-csv.ts) — referenced in package.json but absent from the repo
- [x] Telegram download-watcher written (`apps/api/src/scripts/telegram-download-watcher.ts` + `apps/api/src/modules/telegram/telegram.repository.ts`) — typechecks clean, but **unverified against a live Telegram session**. Do not mark fully done until run against one real tracked channel. Also: `apps/api/telegram-session.txt` is a live leaked credential — rotate it and move the value into `.env` (`TELEGRAM_SESSION`) before using this anywhere.
- [x] GitHub Actions cron worker (`.github/workflows/sync-cron.yml`, `apps/api/src/scripts/cron-sync.ts`) — runs `SyncService.run('websites')` every 30 min directly against Neon via `DATABASE_URL` secret, no public API deployment needed. Also added a secret-protected REST route (`POST /api/sync`, guarded by `SYNC_SECRET`, fails closed if unset) as the alternative path from the roadmap, for if/when the API gets a public deployment. Telegram scope intentionally excluded from the cron — that's the persistent watcher's job, not a poll's.
- [x] Validate the new website adapters against real site markup — CONFIRMED BROKEN by user (2026-07-21): "My Slain Dragon Bride" (7 real chapters, asurascans.com) synced to "Latest Ch. 711". Root cause: `extractChaptersFromHtml` scanned every `<a>` on the whole page with no scoping, so sidebar/"Latest Release"/"Trending" widgets listing *other* series' chapters were misattributed to whatever manhwa was being synced. Fixed by deriving the series slug from the source URL and requiring it to appear in a candidate link's href before accepting it, falling back to the old unscoped scan only if nothing matches. **Still unverified against a live site** — the fix is a reasoned response to one confirmed failure, not a tested one; watch the next sync run's output for this manhwa and others.
- [x] Fixed duplicate source rows (2026-07-21) — user's screenshot showed two identical "asurascans.com" entries under Sources. Cause: no unique constraint on `sources(manhwa_id, url)` + `addSource` did a bare insert. Added `unique(manhwaId, url)` to the schema and made `addSource` insert-or-return-existing. **Requires action before `db:push`**: run `pnpm run dedupe:sources` first or the push will fail on existing duplicate rows.
- [ ] Clean up "My Slain Dragon Bride"'s existing bogus Chapter 711 row in the live DB — not done from here (no DB access). Run `pnpm run purge:chapters -- --title "My Slain Dragon Bride" --max 7` (or whatever the real current chapter count is).
- [x] Cover art (2026-07-21) — manual URL entry already existed; added automated lookup via MangaDex's public API (`libs/parser/src/cover-lookup.ts`, decoupled from reading-source adapters, works for Telegram-only entries), with og:image scrape as fallback when a website source exists. Wired into manual "Add Manhwa" (best-effort, 5s timeout, never blocks creation) and into `apps/api/src/scripts/backfill-covers.ts` for the 214 already-imported entries. **Unverified** — no live network access to MangaDex from the build sandbox; run `pnpm run backfill:covers` and spot-check a handful of results before assuming it worked.

---

## Future 📋

- [ ] Chrome Extension (MV3) — detect page + chapter, POST to API
- [ ] OCI Worker migration
- [ ] Analytics / Statistics page
- [ ] PWA support
- [ ] AI recommendations
- [ ] Backup / Restore
- [ ] Offline mode

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

---

## In Progress / Next 🔲

- [ ] Clean up duplicate chapter entries in database to unblock Drizzle schema push
- [ ] Wire actual backend trigger to "Sync" button (re-scan all Telegram channels)
- [ ] Implement Telegram download-watcher (auto mark chapter as read when PDF downloaded)
- [ ] Wire website adapters into sync flow (pull latest chapter from AsuraScans, Webtoon, etc.)
- [ ] GitHub Actions cron worker (sync every 30 minutes)
- [ ] Cover art — add cover images for manhwa (either scrape or allow manual URL entry)

---

## Future 📋

- [ ] Chrome Extension (MV3) — detect page + chapter, POST to API
- [ ] OCI Worker migration
- [ ] Analytics / Statistics page
- [ ] PWA support
- [ ] AI recommendations
- [ ] Backup / Restore
- [ ] Offline mode

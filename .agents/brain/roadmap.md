# Roadmap — Manhwa Tracker

Entries sourced only from explicit user statements and implementation plans.

---

- Item: Phase 1 — Monorepo scaffold + DB schema + Dashboard + Library + Reading Progress + tRPC API
- Source: User blueprint (session 2026-07-14) + implementation plan
- Status: ✅ COMPLETED (2026-07-15)
- Date noted: 2026-07-14

---

- Item: Phase 2 — Architecture migration (Next.js → Vite + Express decoupled), UI rebuild (shadcn/ui dark theme)
- Source: User decision to migrate away from Next.js (session 2026-07-15)
- Status: ✅ COMPLETED (2026-07-15)
- Date noted: 2026-07-15

---

- Item: Phase 3a — Telegram channel scanning + bulk import from enriched CSV (214 manhwa), reading progress seeding
- Source: User request to import from manhwa-only.enriched.csv (session 2026-07-15)
- Status: ✅ COMPLETED (2026-07-15/16)
- Date noted: 2026-07-15

---

- Item: Phase 3b — Full CRUD on detail page (update progress, change status, add sources, delete manhwa)
- Source: User bug reports + feature requests (session 2026-07-16)
- Status: ✅ COMPLETED (2026-07-16) — later extended with soft delete (recover/getDeleted) and
  per-chapter management (getChapters/deleteChapter)
- Date noted: 2026-07-16

---

- Item: Website adapters (AsuraScans, Webtoon, Reaper Scans, manhuaus.com, generic fallback) + `sync.run` tRPC endpoint + real "Sync" button wired end-to-end
- Source: User blueprint (session 2026-07-14) — libs/parser previously had only a generic OG-tag metadata parser; no `sync` endpoint existed at all
- Status: ✅ COMPLETED (2026-07-21) — since expanded to 10 real site adapters (added Arena Scans,
  Comix.to, Mgeko, RoliaScan, Thunder Scans, Ultimate of All Ages) plus browser-rendering fallback
  for Cloudflare-protected sites. See architecture.md's "Website Adapters" section.
- Date noted: 2026-07-14

---

- Item: Telegram auto-progress — when user reads a chapter in Telegram, auto-mark it as last read; when a new chapter is posted, auto-catalogue it
- Source: User blueprint (session 2026-07-14) — core feature
- Status: ✅ COMPLETED & VERIFIED (2026-07-22) — the watcher (now `apps/worker/src/scripts/watcher/`,
  using `teleproto`, not GramJS) uses new-message events for chapter detection and read-update
  events for read-progress advancement, tested live in production. Historical catch-up is handled
  by periodic reconciliation (`reconcile.ts`) rather than a `catchUp` constructor option, which
  `teleproto`'s installed version doesn't support — see mistakes.md for why pure event-driven alone
  was judged unsafe.
- Date noted: 2026-07-14

---

- Item: Telegram channel scan/import scripts referenced in package.json (`telegram-scan.ts`, `telegram-import.ts`, `telegram-import-from-csv.ts`, `import-from-enriched-csv.ts`)
- Source: Brain previously marked these ✅, but the files do not exist in the repo — likely lost or never committed
- Status: 🔲 TODO — still not written as of 2026-08-28. Needs to be re-written from scratch IF needed
  (data is already imported; new manhwa added manually or via UI/bot)
- Date noted: 2026-07-21

---

- Item: GitHub Actions cron worker — automated 30-minute sync of all sources
- Source: User blueprint (session 2026-07-14)
- Status: ✅ IMPLEMENTED (2026-07-21), then split-related regression found and fixed (2026-08-28) —
  `.github/workflows/sync-cron.yml` runs the worker's `cron:sync` script (website scope only)
  directly against Neon every 30 min. After `apps/api` was split into `apps/api` + `apps/worker`,
  the workflow and `package.json` scripts were left pointing at the old `apps/api` paths for the
  now-worker-only cron/watcher/bot scripts; fixed to target `apps/worker`. Not yet re-verified
  against a live GitHub Actions run since the fix.
- Date noted: 2026-07-14

---

- Item: Split `apps/api` into a fast API (`apps/api`, Vercel Serverless) and a long-running worker
  (`apps/worker`, Docker/Render) for the Telegram watcher, Telegram bot, and website sync
- Source: Deployment needs — Vercel Serverless functions can't run persistent processes like a
  Telegram MTProto client or a long-polling bot
- Status: ✅ COMPLETED — see architecture.md and master-memory.md's "Deployment Architecture" section.
  Left some drift behind in `.github/workflows/sync-cron.yml`, `README.md`, and the brain docs that
  still described the pre-split single-`apps/api` layout; that drift was cleaned up 2026-08-28.
- Date noted: (undated — inferred from the actual repo structure, not an explicit user statement)

---

- Item: AI recommendations, Backup/Restore, Offline mode
- Source: PRD "Future Features" section stated by user
- Status: 🔲 TODO (Future)
- Date noted: 2026-07-14

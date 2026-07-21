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
- Status: ✅ COMPLETED (2026-07-16)
- Date noted: 2026-07-16

---

- Item: Website adapters (AsuraScans, Webtoon, Reaper Scans, manhuaus.com, generic fallback) + `sync.run` tRPC endpoint + real "Sync" button wired end-to-end
- Source: User blueprint (session 2026-07-14) — libs/parser previously had only a generic OG-tag metadata parser; no `sync` endpoint existed at all
- Status: ✅ COMPLETED (2026-07-21) — see architecture.md "Sync Flow" section
- Date noted: 2026-07-14

---

- Item: Telegram auto-progress — when user downloads a chapter PDF from Telegram, auto-mark it as last read
- Source: User blueprint (session 2026-07-14) — core feature
- Status: 🟡 IMPLEMENTED, UNVERIFIED (2026-07-21) — `telegram-download-watcher.ts` uses MTProto read-receipts (`UpdateReadChannelInbox`/`UpdateReadHistoryInbox`) as the closest available proxy for "downloaded", since MTProto has no true file-download event. Never run against a live session. `apps/api/telegram-session.txt` is a leaked live credential — rotate before use.
- Date noted: 2026-07-14

---

- Item: Telegram channel scan/import scripts referenced in `apps/api/package.json` (`telegram-scan.ts`, `telegram-import.ts`, `telegram-import-from-csv.ts`, `import-from-enriched-csv.ts`)
- Source: Brain previously marked these ✅, but the files do not exist in the repo — likely lost or never committed
- Status: 🔲 TODO — needs to be re-written from scratch
- Date noted: 2026-07-21

---

- Item: GitHub Actions cron worker — automated 30-minute sync of all sources
- Source: User blueprint (session 2026-07-14)
- Status: 🟡 IMPLEMENTED, UNVERIFIED (2026-07-21) — `.github/workflows/sync-cron.yml` runs `cron-sync.ts` (website scope only) directly against Neon every 30 min. Secret-protected `POST /api/sync` REST route also added for a future public-deployment path. Not yet run in a real GitHub Actions environment — verify secrets (`DATABASE_URL`) are set in repo settings before trusting it.

---

- Item: Chrome Extension (MV3) — detect manhwa page + chapter in browser, POST progress to API
- Source: User blueprint (session 2026-07-14)
- Status: 🔲 TODO (Phase 4)
- Date noted: 2026-07-14

---

- Item: OCI Worker migration — replace GitHub Actions with OCI compute instance (no business logic change)
- Source: User blueprint (session 2026-07-14)
- Status: 🔲 TODO (Phase 4)
- Date noted: 2026-07-14

---

- Item: Analytics / Statistics page — reading trends, chapter completion stats
- Source: User blueprint (session 2026-07-14)
- Status: 🔲 TODO (Phase 4)
- Date noted: 2026-07-14

---

- Item: PWA support
- Source: User blueprint (session 2026-07-14)
- Status: 🔲 TODO (Phase 4)
- Date noted: 2026-07-14

---

- Item: AI recommendations, Backup/Restore, Offline mode
- Source: PRD "Future Features" section stated by user
- Status: 🔲 TODO (Future)
- Date noted: 2026-07-14

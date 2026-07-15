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

- Item: Sync button — manually trigger a re-scan of all Telegram channels and update latest chapter counts
- Source: UI placeholder is wired; backend re-scan trigger is not yet wired
- Status: 🔲 TODO
- Date noted: 2026-07-16

---

- Item: Telegram auto-progress — when user downloads a chapter PDF from Telegram, auto-mark it as last read
- Source: User blueprint (session 2026-07-14) — core feature
- Status: 🔲 TODO (GramJS download-watcher.ts not yet implemented)
- Date noted: 2026-07-14

---

- Item: Website adapter scraping — fetch latest chapter from AsuraScans, Webtoon, etc. via Cheerio
- Source: User blueprint (session 2026-07-14) — libs/parser exists but adapters not fully wired to sync flow
- Status: 🔲 TODO
- Date noted: 2026-07-14

---

- Item: GitHub Actions cron worker — automated 30-minute sync of all sources
- Source: User blueprint (session 2026-07-14)
- Status: 🔲 TODO
- Date noted: 2026-07-14

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

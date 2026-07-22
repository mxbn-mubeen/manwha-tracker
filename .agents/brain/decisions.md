# Decisions — Manhwa Tracker

Append-only log. Never delete entries.

---

- Decision: Use PNPM Workspaces + TurboRepo for monorepo
- Reason: Native workspace protocol, fast caching with Turbo pipelines, good Next.js 15 compatibility
- Alternatives considered: Nx (heavier config), Yarn Workspaces (slower), Lerna (legacy)
- Date: 2026-07-14

---

- Decision: No authentication system
- Reason: Personal single-user app only. Auth adds schema complexity (user_id everywhere) with zero benefit for this use case.
- Alternatives considered: NextAuth (overkill), Clerk (paid, overkill)
- Date: 2026-07-14

---

- Decision: Telegram integration via GramJS MTProto personal account
- Reason: User already has API_ID + API_HASH + PHONE from existing telbot project. Personal account can read any channel the user has joined (far more powerful than bot tokens which need admin access).
- Alternatives considered: Telegram Bot API (limited to channels where bot is admin)
- Date: 2026-07-14

---

- Decision: Telegram download = auto Last Read
- Reason: User's workflow is: see new chapter in Telegram → download it → that IS their last read action. Automating this removes manual tracking friction entirely.
- Alternatives considered: Manual "mark as read" button, browser extension only
- Date: 2026-07-14

---

- Decision: 6 website adapters at launch (MangaDex, Webtoon, AsuraScans, Reaper Scans, Flame Comics, manhuaus.com)
- Reason: User specified manhuaus.com explicitly + major sites cover most manhwa reading
- Alternatives considered: MangaDex only (insufficient coverage)
- Date: 2026-07-14

---

- Decision: MangaDex uses public REST API, others use Cheerio HTML scraping
- Reason: MangaDex has a free, documented API. Other sites have no official API.
- Alternatives considered: Puppeteer (heavy, slow, needs headless browser) — kept behind USE_HEADLESS env flag for fallback
- Date: 2026-07-14

---

- Decision: GitHub Actions for scheduler (Phase 1-3), OCI Worker in Phase 4
- Reason: GH Actions is free and requires zero infra setup. Business logic fully decoupled so migration = new entrypoint only.
- Alternatives considered: Vercel Cron (limited free tier intervals), standalone VPS (maintenance overhead)
- Date: 2026-07-14

---

- Decision: tRPC as primary API, REST routes as fallback for non-browser clients
- Reason: tRPC gives end-to-end type safety for the web app. REST needed for Chrome Extension and worker scripts which cannot use tRPC client easily.
- Alternatives considered: REST-only (loses type safety), GraphQL (overkill)
- Date: 2026-07-14

---

- Decision: Drizzle ORM over Prisma
- Reason: Better Neon PostgreSQL serverless compatibility, lighter runtime, schema defined in TypeScript code
- Alternatives considered: Prisma (heavier runtime, slower cold starts on Vercel serverless)
- Date: 2026-07-14

---

- Decision: Use only plain Drizzle query builder (`select/insert/update/delete`) — never relational API or transactions
- Reason: `drizzle-orm/neon-http` driver does not support `db.query.*` relational API (silently fails) or `db.transaction()` (throws at runtime). This is a hard constraint of the Neon HTTP serverless driver.
- Alternatives considered: Switching to `neon-serverless` WebSocket driver (would enable transactions + relational API, but requires persistent WS connection unsuitable for serverless/scripts)
- Date: 2026-07-16

---

- Decision: Use `onConflictDoUpdate` upserts everywhere instead of read-then-update patterns
- Reason: No transaction support means read-then-update has a race window. `onConflictDoUpdate` is atomic at the DB level and works with the neon-http driver.
- Alternatives considered: Two-step update (fragile without transactions)
- Date: 2026-07-16

---

- Decision: Manhwa detail page renders all data dynamically from the API (no hardcoded fallbacks)
- Reason: Initial implementation had hardcoded author ("TurtleMe"), description, sources, and chapter count (241) as static HTML. This caused every manhwa to show the same wrong data.
- Alternatives considered: Leaving hardcoded values as "default" (rejected — causes data integrity confusion)
- Date: 2026-07-16

---

- Decision: Website adapters use one shared markup-agnostic "scan every `<a>` tag for a chapter number" extractor (`chapter-extract.ts`), rather than hand-written CSS selectors per site
- Reason: Built without live network access to AsuraScans/Webtoon/Reaper Scans/manhuaus.com to inspect real markup, so selector-specific scraping couldn't be verified. A generic link-text/href regex scan is markup-agnostic and degrades gracefully; per-site adapters can layer tighter selectors on top later once tested against the real sites.
- Alternatives considered: Hand-written CSS selectors per site (more accurate if correct, but unverifiable here and brittle to markup changes); Puppeteer/headless browser (heavier, not needed since these are server-rendered pages)
- Date: 2026-07-21

---

- Decision: `sync.run` tRPC mutation is unauthenticated, matching the rest of the API
- Reason: Single-user personal app, same trust model as every other endpoint (no auth system by design).
- Alternatives considered: Requiring the `secret` from `TriggerSyncSchema` even for the in-app button (rejected — that schema is for an external cron trigger, not the logged-in user's own button)
- Date: 2026-07-21

---

- Decision: Per-source chapter stats added to `getById` only, not `getAll`
- Reason: Library page doesn't use per-source data. Adding another GROUP BY query to every library page load is wasteful with no immediate benefit. Extend `getAll` when Library cards actually need the data.
- Alternatives considered: Adding to `getAll` preemptively (rejected — unnecessary N+1-equivalent work per library load)
- Affected modules: apps/api/src/modules/manhwa/manhwa.repository.ts (getById only)
- Date: 2026-07-22

---

- Decision: `lastDiscoveredAt` (not `lastCheckedAt`) is the field name for per-source chapter timestamps
- Reason: `MAX(chapters.discovered_at)` is when a chapter was *found* from that source, not when the source was polled. Naming it `lastCheckedAt` would be misleading — a true polling timestamp would require a separate column on the `sources` table.
- Alternatives considered: `lastCheckedAt` (rejected — factually incorrect for this data), `lastSyncedAt` (ambiguous — could mean the last sync run, not the last chapter found)
- Affected modules: apps/api/src/modules/manhwa/manhwa.repository.ts, apps/web/src/features/manhwa-detail/components/SourcesList.tsx
- Date: 2026-07-22

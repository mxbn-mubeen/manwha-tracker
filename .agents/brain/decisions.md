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

- Decision: Use explicit Drizzle migrations (db:generate + db:migrate) instead of db:push
- Reason: drizzle-kit push failed to apply schema updates using the neon-http driver.
- Alternatives considered: Keeping db:push (failed), using local psql (defeats neon serverless config).
- Affected modules: libs/database/, package.json, README.md
- Date: 2026-07-23


---

- Decision: handleSessionDeath uses an optional onShutdown callback instead of hardcoded process.exit(1)
- Reason: The watcher is embedded in the same process as the API server. Calling process.exit(1) on any session error killed the entire API, making the app completely unusable. The callback pattern lets each caller decide the correct shutdown behaviour (graceful watcher stop vs full process exit for standalone script).
- Alternatives considered: Keeping process.exit(1) and restarting the whole server on death (rejected — unnecessary, the API should keep serving while the user generates a new session); Moving watcher to a separate process (valid long-term option but adds operational complexity for a single-user personal app)
- Affected modules: apps/api/src/scripts/watcher/session.ts, apps/api/src/scripts/watcher/index.ts
- Date: 2026-07-24

---

- Decision: Bot conflict resolution commands use /replace and /cancel (slash-prefixed) in all reply text
- Reason: Telegram renders any /command as a clickable blue link. Plain words "replace" and "cancel" required manual typing. Slash format is zero-cost and removes friction.
- Alternatives considered: Inline keyboard buttons (cleaner UX but requires restructuring the bot to use callback queries, higher complexity for a personal tool)
- Affected modules: apps/api/src/scripts/bot/handlers.ts
- Date: 2026-07-24

---

- Decision: TelegramSection phone input defaults to user's number from localStorage
- Reason: The Telegram login flow requires entering the phone number every time a new session is needed. Since this is a single-user personal app, defaulting to the stored number saves repeated typing.
- Alternatives considered: Hardcoded constant (fragile if number changes); server-side setting (overkill for a UI convenience)
- Affected modules: apps/web/src/features/settings/components/TelegramSection.tsx
- Date: 2026-07-24

---

- Decision: Replaced Node's global `fetch` with `https.request` in Bot API long-polling loop and enforced `--max-old-space-size=256` limit on the Node server.
- Reason: The Bot API heavily uses 30-second long-polling, and Node's built-in `fetch` (powered by `undici`) has documented memory leaks/segfault bugs when dealing with aborted/sustained idle connections in Node 18/20. Running on Render Free Tier (512MB limit) without V8 limits exacerbated this, causing Status 139 segfault crashes after a few hours. Native `https.request` bypasses `undici` entirely, and V8 limits force GC before hitting OS hard limits.
- Alternatives considered: Using `node-fetch` or `axios` (adds unnecessary dependency weight since native `https` works fine for this simple loop).
- Affected modules: apps/api/package.json, apps/api/src/scripts/bot/api.ts
- Date: 2026-07-27

---

- Decision: Use `got-scraping` via dynamic import instead of native `fetch` or `Puppeteer` for HTML parsing.
- Reason: The native `fetch` adapter was consistently blocked with 403 Forbidden by Cloudflare on GitHub Actions and Render IPs. Puppeteer was considered as a fallback but was deemed too heavy for Render's 512MB free tier memory limit. `got-scraping` provides TLS fingerprint spoofing and browser-like headers with almost zero memory overhead. The dynamic `import()` via `Function` trick is used to bypass TypeScript transpiling ESM imports to `require()` in CommonJS projects.
- Alternatives considered: Puppeteer (too much memory), native `fetch` with headers (failed on Cloudflare).
- Affected modules: libs/parser/src/adapters/http.ts, libs/parser/package.json
- Date: 2026-07-27

---

- Decision: Split `server.ts` into modular router files (`routes/sync.ts`, `routes/proxy.ts`, `routes/health.ts`).
- Reason: `server.ts` grew beyond 300 lines and was mixing server initialization, background cron jobs, TRPC mounting, and Express REST routes. Modularizing it makes it easier to navigate.
- Alternatives considered: Keep as monolithic file (too noisy).
- Affected modules: apps/api/src/server.ts, apps/api/src/routes/*
- Date: 2026-08-16

---

- Decision: Locked chapters (early access/coin-locked) are filtered via regex in the scraper (`LOCKED_CHAPTER_INDICATOR`) or gap detection (missing links) instead of JS/DOM evaluation.
- Reason: Scrapers run on raw HTML. Paid chapters on sites like AsuraScans or Thunderscans either lack an `href` (using JS `onclick` modals) or contain explicit text ("Coin", "Early Access", "Login to read"). Filtering these at the extraction level prevents the app from notifying the user about chapters they cannot read yet, without needing a full headless browser to evaluate the paywall.
- Alternatives considered: Headless browser to check paywalls (too heavy).
- Affected modules: libs/parser/src/adapters/utils/chapter-extract.ts, libs/parser/src/adapters/sites/thunderscans.ts
- Date: 2026-08-16

---

- Decision: `apps/api` was split into `apps/api` (fast tRPC queries, Vercel Serverless) and a new
  `apps/worker` (long-running: Telegram watcher, Telegram bot, website sync, Docker/Render). Note:
  the exact date this split happened isn't recorded in this log — it predates this entry. All
  "Affected modules" paths in decision entries above this one that say `apps/api/src/scripts/...`
  reflect the pre-split layout and were accurate at the time they were written; those scripts now
  live under `apps/worker/src/scripts/...`. This entry exists to document the split itself, which
  was never logged when it happened.
- Reason: Vercel Serverless Functions can't run persistent processes (a Telegram MTProto client,
  a long-polling bot) — those need to live somewhere long-running, decoupled from the fast API.
- Alternatives considered: Keeping everything in one `apps/api` deployed somewhere that supports
  long-running processes (rejected — loses Vercel's free/fast serverless tier for the UI-facing queries).
- Affected modules: apps/api/*, apps/worker/* (new), .github/workflows/sync-cron.yml
- Date: (undated in this log — discovered retroactively 2026-08-28)

---

- Decision: Fixed `.github/workflows/sync-cron.yml` and `apps/api`/`apps/worker` `package.json`
  scripts after the `apps/api`/`apps/worker` split left them pointing at the wrong package —
  the workflow still built/ran from `apps/api`, and `apps/api/package.json` still declared
  `cron:sync`/`watch:telegram`/`bot:telegram` scripts pointing at `src/scripts/...` files that no
  longer exist there (they moved to `apps/worker`). This was causing the GitHub Actions sync cron
  to fail with `ERR_MODULE_NOT_FOUND`.
- Reason: The workflow and script declarations were never updated when the split happened.
- Alternatives considered: None — this was a straightforward drift fix, not a design decision.
- Affected modules: .github/workflows/sync-cron.yml, apps/api/package.json, apps/worker/package.json
- Date: 2026-08-28

---

- Decision: Fixed `ADAPTER_KEYS` in `libs/shared/src/constants.ts`, which had drifted from the real
  website adapters in `libs/parser/src/adapters/sites/` — it listed `mangadex` (not a website
  adapter; MangaDex is only used for cover-image lookup) and `flamecomics` (no adapter file exists
  for it), and was missing `generic`, `arenascans`, `comixto`, `mgeko`, `roliascan`, `thunderscans`,
  and `ultimateofallages`. Confirmed `ADAPTER_KEYS`/`AdapterKey` aren't consumed anywhere else in
  the codebase yet (no zod schema, DB constraint, or UI dropdown references them), so this was
  pure documentation drift with no runtime impact at the time of the fix.
- Reason: `WebsiteAdapter.key` is typed as plain `string`, so nothing enforced the two lists staying
  in sync as adapters were added over time.
- Alternatives considered: Also changing `WebsiteAdapter.key` to be typed as `AdapterKey` so this
  can't silently drift again (deferred — logged as a follow-up in task.md rather than done as part
  of this fix, since it touches every adapter file).
- Affected modules: libs/shared/src/constants.ts
- Date: 2026-08-28

---

- Decision: `getIsSyncing()` now treats the `sys_is_syncing` DB flag as stale (and self-clears it)
  if it's been `true` for more than 15 minutes, instead of trusting it forever.
- Reason: User reported the site's Sync button showing "Syncing..." on every page load with no
  sync actually running. Root cause: `SyncService.run()` only clears the lock in a `finally` block,
  but syncs website sources sequentially with up to a 60s timeout each (plus a 70s FlareSolverr
  wake-up), while `.github/workflows/sync-cron.yml`'s job had `timeout-minutes: 10`. A library with
  roughly 9+ sources hitting worst-case timeouts in one run (e.g. `70s + 9×60s = 610s > 600s`) gets
  the whole job force-killed by GitHub Actions before the `finally` block can run, permanently
  sticking the lock at `true` in the database until some other run happens to complete cleanly.
  Raised the workflow's `timeout-minutes` to 25 as the other half of the fix, but the self-healing
  check is the real safety net — the lock can still be abandoned by other means (a Render redeploy
  killing the worker mid-sync via `POST /trpc/sync.run`, an OOM kill, etc.), and this makes the app
  recover from any of those on its own instead of needing a manual DB fix.
- Alternatives considered: Only raising the workflow timeout (rejected — doesn't cover a killed
  worker process outside the cron path, and doesn't self-heal an already-stuck lock from before
  the fix); wrapping the cron job in a hard process-level watchdog that force-clears the flag on
  exit (more complex than a staleness check for the same outcome).
- Affected modules: apps/worker/src/modules/sync/sync.service.ts,
  apps/api/src/modules/sync/sync.service.ts (same fix mirrored — its `getIsSyncing` is what the
  frontend's poll actually calls), apps/api/src/modules/settings/settings.repository.ts and
  apps/worker/src/modules/settings/settings.repository.ts (added `getUpdatedAt`),
  .github/workflows/sync-cron.yml (`timeout-minutes: 10` → `25`)
- Date: 2026-08-28

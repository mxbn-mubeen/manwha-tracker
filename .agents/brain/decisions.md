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

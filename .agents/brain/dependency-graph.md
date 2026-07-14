# Dependency Graph — Manhwa Tracker

Generated: 2026-07-14 (pre-scaffold — based on planned architecture)
Note: No code exists yet. Graph reflects planned import structure.

---

## Package Dependencies

```
apps/web           → imports → @manhwa-tracker/database, @manhwa-tracker/shared, @manhwa-tracker/ui, @manhwa-tracker/utils, @manhwa-tracker/parser
apps/worker        → imports → @manhwa-tracker/database, @manhwa-tracker/shared, @manhwa-tracker/parser
apps/extension     → imports → @manhwa-tracker/shared, @manhwa-tracker/utils

packages/database  → imports → @manhwa-tracker/shared (for types)
packages/ui        → imports → @manhwa-tracker/shared (for types)
packages/parser    → imports → @manhwa-tracker/utils
packages/utils     → imports → (none — leaf node)
packages/shared    → imports → (none — leaf node)
```

## Internal Module Dependencies (apps/web)

```
app/ (pages/layouts)              → imports → features/, lib/trpc/
features/dashboard/               → imports → server/services/, server/db/
features/library/                 → imports → server/services/, server/db/
features/tracking/                → imports → server/services/
features/notifications/           → imports → server/services/
features/telegram/                → imports → server/db/, @manhwa-tracker/parser
features/websites/adapters/       → imports → @manhwa-tracker/parser, @manhwa-tracker/shared
server/api/routers/               → imports → server/services/
server/services/                  → imports → server/db/ (repositories)
server/db/ (repositories)         → imports → @manhwa-tracker/database
```

## External Dependencies (planned)

```
apps/web:
  gramjs          → Telegram MTProto client
  cheerio         → HTML scraping for site adapters
  @trpc/server    → tRPC router
  @trpc/client    → tRPC client
  drizzle-orm     → ORM
  @neondatabase/serverless → Neon PostgreSQL driver
  zod             → Schema validation
  @tanstack/react-query → Data fetching
  zustand         → Client state
  chakra-ui       → Component library

apps/worker:
  gramjs          → Same Telegram client
  dotenv          → Env loading for standalone script

apps/extension:
  react           → Popup UI
  vite + crxjs    → Build tooling
```

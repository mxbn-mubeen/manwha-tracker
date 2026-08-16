# Patterns — Manhwa Tracker

Updated when a new pattern is adopted, not on every commit.

---

## Monorepo Package Referencing

Internal packages are referenced via PNPM workspace protocol:

```json
// apps/web/package.json
{
  "dependencies": {
    "@manhwa-tracker/database": "workspace:*",
    "@manhwa-tracker/shared": "workspace:*",
    "@manhwa-tracker/ui": "workspace:*",
    "@manhwa-tracker/utils": "workspace:*",
    "@manhwa-tracker/parser": "workspace:*"
  }
}
```

Package names follow `@manhwa-tracker/<name>` convention.

---

## Repository Pattern (DB Layer)

All database access goes through `ManhwaRepository` class methods. **Never** use `db.query.*` (relational API) or `db.transaction()` — both are unsupported by the `neon-http` driver.

```typescript
// apps/api/src/modules/manhwa/manhwa.repository.ts
export class ManhwaRepository {
  async getAll() {
    // ✅ Use plain select + leftJoin (NOT db.query.manhwa.findMany)
    return db.select({...}).from(manhwa).leftJoin(progress, ...).leftJoin(sources, ...);
  }

  async updateProgress(manhwaId: number, chapterNum: number) {
    // ✅ Use onConflictDoUpdate (NOT transaction + update)
    await db.insert(progress).values({...}).onConflictDoUpdate({
      target: progress.manhwaId,
      set: { chapterId: ..., lastReadAt: new Date() },
    });
  }
}
```

---

## Service Pattern (Business Logic)

Services orchestrate repositories and contain business rules. Never put business logic in tRPC routers or API routes.

```typescript
// apps/web/server/services/manhwa.service.ts
export async function addManhwaToLibrary(url: string) {
  const adapter = AdapterFactory.for(url);
  const title = await adapter.detectTitle(url);
  const chapters = await adapter.chapterList(url);
  await upsertManhwa({ title, slug: slugify(title) });
  await upsertChapters(chapters);
}
```

---

## Website Adapter Pattern

All adapters implement the WebsiteAdapter interface. Never add site-specific logic outside the adapter file.

```typescript
// packages/shared/src/types/adapter.ts
export interface WebsiteAdapter {
  key: string;                    // e.g. 'mangadex', 'manhuaus'
  detectTitle(url: string): Promise<string | null>;
  latestChapter(manhwaUrl: string): Promise<ChapterInfo | null>;
  chapterList(manhwaUrl: string): Promise<ChapterInfo[]>;
}
```

Factory usage:
```typescript
import { detectAdapterKey, getAdapter } from '@manhwa-tracker/parser';
const key = detectAdapterKey(sourceUrl);  // 'asurascans' | 'webtoon' | 'reaperscans' | 'manhuaus' | 'generic'
const adapter = getAdapter(key, sourceUrl);
const latest = await adapter.latestChapter(sourceUrl);
```

---

## Zod Validation Pattern

All API inputs validated with Zod. Schemas live in `libs/shared/src/schemas/` (or inline in the router).

```typescript
// apps/api/src/modules/manhwa/manhwa.router.ts
update: publicProcedure
  .input(z.object({
    id: z.coerce.number().int().positive(),
    title: z.string().min(1).optional(),
    genres: z.array(z.string()).optional(),
  }))
  .mutation(async ({ input }) => { ... })
```

tRPC routers use `.input(schema)`:
```typescript
progress.update.useMutation({...})
// router:
.input(UpdateProgressSchema)
.mutation(async ({ input }) => { ... })
```

---

## Neon Singleton Pattern

Single Neon connection instance, shared across the app. Never create multiple connections.

```typescript
// libs/database/src/db.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

---

## tRPC Router Pattern

Routers are modular by domain. All routers composed into root router.

```typescript
// apps/api/src/root.ts
export const appRouter = createTRPCRouter({
  manhwa: manhwaRouter,
  sync: syncRouter,
  settings: settingsRouter,
});
```

---

## Chapter Number Extraction

Use `packages/parser` for all chapter number parsing. Never write ad-hoc regex in adapters.

```typescript
import { extractChapterNumber } from '@manhwa-tracker/parser';
const num = extractChapterNumber("Chapter 150 - The Return"); // → 150
```

---

## Progress Auto-Update from Telegram

`telegram-download-watcher.ts` uses a **purely event-driven** model (no polling, no historical fetch):

1. `NewMessageEvent` fires when a tracked channel posts a new message:
   - Extract chapter number from message caption or filename
   - Only process if message has a document attached (prevents ads from triggering false chapters)
   - Insert into `chapters` table + touch `manhwa.updatedAt`
2. `UpdateReadChannelInbox` fires when user reads messages in a tracked channel:
   - Fetch the messages in the read range (up to 10), find the highest chapter number
   - Upsert the chapter row if it wasn't already catalogued
   - Call `markAsReadIfNewer` — only advances progress, never goes backwards

⚠️ **Do NOT add historical fetch/catch-up logic** — Telegram channels post cross-promotional ads that contain chapter-shaped numbers from other manhwas. Blind scanning of historical messages will corrupt chapter data (logged in mistakes.md).

---

## Locked / Early Access Chapters

Sites often lock new chapters behind coins (Thunderscans) or "Early Access" (AsuraScans).
- **Rule**: Never notify the user about a chapter they cannot read yet.
- **Pattern**: Filter out locked chapters entirely during scraping.
  - Generic indicator matching: use `LOCKED_CHAPTER_INDICATOR` regex (matches "coin", "🪙", "early access", "login", etc.) on chapter titles/badges in `chapter-extract.ts`.
  - Gap detection: if a site provides fake teaser links but hides the real content (Thunderscans), check the gap between chapter numbers. E.g. if the last free chapter is 150 and the crawler sees 151 and 160, it drops anything above 150 until 151 is actually readable.
  - Never use a headless browser just to execute the paywall check scripts (too heavy). Filter entirely via static HTML analysis.

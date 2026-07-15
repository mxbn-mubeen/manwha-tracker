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
const adapter = AdapterFactory.for(sourceUrl); // returns correct adapter or throws
const latest = await adapter.latestChapter(url);
```

---

## Zod Validation Pattern

All API inputs validated with Zod. Schemas live in `packages/shared/src/schemas/`.

```typescript
// packages/shared/src/schemas/progress.ts
export const UpdateProgressSchema = z.object({
  manhwaId: z.number().int().positive(),
  chapterNum: z.number(),
  lastReadAt: z.date().optional(),
});
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
// packages/database/src/db.ts
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
// apps/web/server/api/root.ts
export const appRouter = createTRPCRouter({
  manhwa: manhwaRouter,
  progress: progressRouter,
  sync: syncRouter,
  notifications: notificationsRouter,
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

When GramJS detects a media download event for a manhwa chapter message:
1. Extract chapter number from message
2. Look up manhwa by channel → manhwa mapping in settings/sources table
3. Call progress service to upsert last_read_at + chapter_id
4. Never update progress for messages older than current last_read

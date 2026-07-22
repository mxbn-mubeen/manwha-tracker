import { db, manhwa, sources, chapters } from '@manhwa-tracker/database';
import { eq, and, sql } from 'drizzle-orm';

export class SyncRepository {
  /**
   * All active sources of a given type, joined with their manhwa's title.
   * Plain select + join only — neon-http does not support the relational API.
   * Excludes manhwa marked 'completed', 'dropped', or 'hiatus': there's nothing
   * new to check for on any of those, and leaving them included means the sync
   * keeps surfacing "new chapters available" on a series the user isn't actively
   * following right now.
   */
  async getActiveSources(type: 'telegram' | 'website') {
    return await db
      .select({
        sourceId: sources.id,
        manhwaId: sources.manhwaId,
        manhwaTitle: manhwa.title,
        url: sources.url,
        type: sources.type,
        adapterKey: sources.adapterKey,
      })
      .from(sources)
      .innerJoin(manhwa, eq(manhwa.id, sources.manhwaId))
      .where(and(
        eq(sources.isActive, true),
        eq(sources.type, type),
        sql`${manhwa.status} NOT IN ('completed', 'dropped', 'hiatus')`,
      ));
  }

  async getExistingChapterNums(manhwaId: number): Promise<Set<number>> {
    const rows = await db
      .select({ chapterNum: chapters.chapterNum })
      .from(chapters)
      .where(eq(chapters.manhwaId, manhwaId));
    return new Set(rows.map(r => r.chapterNum));
  }

  /** Insert newly-discovered chapters in bulk. No-ops for rows where (manhwaId, chapterNum) already exists. */
  async insertChaptersBulk(data: Array<{
    manhwaId: number;
    sourceId: number;
    chapterNum: number;
    title: string | null;
    url: string | null;
  }>): Promise<number> {
    if (data.length === 0) return 0;
    const inserted = await db
      .insert(chapters)
      .values(data)
      .onConflictDoNothing()
      .returning();
    return inserted.length;
  }

  async touchManhwaUpdatedAt(manhwaId: number) {
    await db.update(manhwa).set({ updatedAt: new Date() }).where(eq(manhwa.id, manhwaId));
  }
}

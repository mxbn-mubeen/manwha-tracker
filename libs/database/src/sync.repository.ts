import { db } from './db';
import { manhwa, sources, chapters, syncRuns, type InsertSyncRunRow } from './schema';
import { eq, and, sql, desc } from 'drizzle-orm';

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

  /**
   * Same as getActiveSources, but groups them by manhwaId.
   * Sorted by priority ASC so the leading source (priority=1) is first in the array.
   */
  async getActiveSourcesGroupedByManhwa(type: 'telegram' | 'website') {
    const rows = await db
      .select({
        sourceId: sources.id,
        manhwaId: sources.manhwaId,
        manhwaTitle: manhwa.title,
        url: sources.url,
        type: sources.type,
        adapterKey: sources.adapterKey,
        priority: sources.priority,
      })
      .from(sources)
      .innerJoin(manhwa, eq(manhwa.id, sources.manhwaId))
      .where(and(
        eq(sources.isActive, true),
        eq(sources.type, type),
        sql`${manhwa.status} NOT IN ('completed', 'dropped', 'hiatus')`,
      ))
      .orderBy(sql`${sources.manhwaId} ASC`, sql`${sources.priority} ASC`);

    const grouped = new Map<number, Array<typeof rows[0]>>();
    for (const row of rows) {
      if (!grouped.has(row.manhwaId)) {
        grouped.set(row.manhwaId, []);
      }
      grouped.get(row.manhwaId)!.push(row);
    }
    return grouped;
  }

  /**
   * Gets the last 10 chapter discovery dates for a manhwa, to calculate release cadence.
   */
  async getChapterReleaseDates(manhwaId: number): Promise<Date[]> {
    const rows = await this.getChapterReleaseDatesWithSource(manhwaId);
    return rows.map((r) => r.date);
  }

  /**
   * Same data as getChapterReleaseDates, but also reports whether each date
   * is a real website publication timestamp or a discoveredAt fallback.
   * Uses typed column selects for both fields (not a raw sql`` fragment),
   * so drizzle handles the Date conversion natively — no risk of the
   * string-vs-Date pitfall that affected the old raw-COALESCE query.
   */
  async getChapterReleaseDatesWithSource(
    manhwaId: number,
  ): Promise<{ date: Date; isReal: boolean; chapterNum: number }[]> {
    const rows = await db
      .select({ publishedAt: chapters.publishedAt, discoveredAt: chapters.discoveredAt, chapterNum: chapters.chapterNum })
      .from(chapters)
      .where(eq(chapters.manhwaId, manhwaId))
      .orderBy(desc(chapters.chapterNum))
      .limit(10);
    return rows
      .map((r) => ({
        date: r.publishedAt ?? r.discoveredAt,
        isReal: r.publishedAt !== null,
        chapterNum: r.chapterNum,
      }))
      .reverse(); // ascending order, oldest first — same contract as before
  }

  /**
   * Promotes the specified source to priority 1, demotes all other sources for
   * this manhwa to priority 10.
   */
  async promoteLeadingSource(manhwaId: number, winnerSourceId: number) {
    await db.update(sources)
      .set({ priority: sql`CASE WHEN id = ${winnerSourceId} THEN 1 ELSE 10 END` })
      .where(eq(sources.manhwaId, manhwaId));
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
    publishedAt?: Date | null;
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

  async updateSourceSyncStatus(sourceId: number, latestChapter: number) {
    await db.update(sources).set({ 
      lastSyncedChapter: latestChapter, 
      lastSyncedAt: new Date() 
    }).where(eq(sources.id, sourceId));
  }

  async insertSyncRun(data: Omit<InsertSyncRunRow, 'id' | 'runAt'>) {
    await db.insert(syncRuns).values(data);
  }

  /**
   * Insert a 'running' placeholder row at the start of a sync run.
   * Returns the new row's id so it can be updated with the final result.
   * Solves the problem of killed syncs vanishing from history entirely.
   */
  async startSyncRun(triggeredBy: 'manual' | 'cron'): Promise<number> {
    const [row] = await db
      .insert(syncRuns)
      .values({ status: 'running', triggeredBy })
      .returning({ id: syncRuns.id });
    if (!row) throw new Error('Failed to start sync run record');
    return row.id;
  }

  /**
   * Finalize a sync run record started with startSyncRun.
   * Call in a finally block so even a failed/killed run gets a row.
   */
  async finishSyncRun(id: number, data: Omit<InsertSyncRunRow, 'id' | 'runAt' | 'status'>, status: 'completed' | 'failed' = 'completed') {
    await db.update(syncRuns).set({ ...data, status }).where(eq(syncRuns.id, id));
  }

  async getRecentSyncRuns(limit: number = 20) {
    return await db.select().from(syncRuns).orderBy(desc(syncRuns.runAt)).limit(limit);
  }
}
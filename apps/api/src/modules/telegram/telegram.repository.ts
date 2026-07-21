import { db, manhwa, sources, chapters, progress } from '@manhwa-tracker/database';
import { eq, and, sql } from 'drizzle-orm';

export class TelegramRepository {
  /** All active telegram sources, joined with their manhwa title — for building the channel → manhwa map. */
  async getActiveTelegramSources() {
    return await db
      .select({
        sourceId: sources.id,
        manhwaId: sources.manhwaId,
        manhwaTitle: manhwa.title,
        url: sources.url,
      })
      .from(sources)
      .innerJoin(manhwa, eq(manhwa.id, sources.manhwaId))
      .where(and(eq(sources.isActive, true), eq(sources.type, 'telegram')));
  }

  async getMaxChapterNum(manhwaId: number): Promise<number> {
    const [row] = await db
      .select({ max: sql<number | null>`MAX(${chapters.chapterNum})` })
      .from(chapters)
      .where(eq(chapters.manhwaId, manhwaId));
    return row?.max ?? 0;
  }

  /** Insert a chapter discovered from a Telegram message. No-ops if (manhwaId, chapterNum) already exists. */
  async insertChapter(data: {
    manhwaId: number;
    sourceId: number;
    chapterNum: number;
    title: string | null;
    url: string | null;
    publishedAt: Date | null;
  }) {
    const [inserted] = await db
      .insert(chapters)
      .values({
        manhwaId: data.manhwaId,
        sourceId: data.sourceId,
        chapterNum: data.chapterNum,
        title: data.title,
        url: data.url,
        publishedAt: data.publishedAt,
      })
      .onConflictDoNothing()
      .returning();
    return inserted ?? null;
  }

  /** Find (or need-to-insert-first) the chapter row for a given manhwa + chapter number. */
  async findChapter(manhwaId: number, chapterNum: number) {
    const [row] = await db
      .select()
      .from(chapters)
      .where(and(eq(chapters.manhwaId, manhwaId), eq(chapters.chapterNum, chapterNum)))
      .limit(1);
    return row ?? null;
  }

  /** Current last-read chapter number for a manhwa (0 if no progress row or no chapter linked yet). */
  async getLastReadChapterNum(manhwaId: number): Promise<number> {
    const [row] = await db
      .select({ num: chapters.chapterNum })
      .from(progress)
      .leftJoin(chapters, eq(chapters.id, progress.chapterId))
      .where(eq(progress.manhwaId, manhwaId))
      .limit(1);
    return row?.num ?? 0;
  }

  async markAsReadIfNewer(manhwaId: number, chapterId: number, chapterNum: number): Promise<boolean> {
    const result = await db.execute(sql`
      INSERT INTO progress (manhwa_id, chapter_id, last_read_at, is_completed)
      VALUES (${manhwaId}, ${chapterId}, NOW(), false)
      ON CONFLICT (manhwa_id) DO UPDATE 
      SET chapter_id = ${chapterId}, last_read_at = NOW()
      WHERE (
        SELECT chapter_num FROM chapters WHERE id = ${chapterId}
      ) > COALESCE((
        SELECT chapter_num FROM chapters WHERE id = progress.chapter_id
      ), 0)
      RETURNING id;
    `);
    
    // Different Postgres drivers return the result rows differently.
    // Drizzle with Postgres.js returns an array of rows directly on `result`,
    // while node-postgres returns `{ rows: [...] }`.
    const rows = Array.isArray(result) ? result : (result as any).rows;
    return Array.isArray(rows) && rows.length > 0;
  }

  async touchManhwaUpdatedAt(manhwaId: number) {
    await db.update(manhwa).set({ updatedAt: new Date() }).where(eq(manhwa.id, manhwaId));
  }
}

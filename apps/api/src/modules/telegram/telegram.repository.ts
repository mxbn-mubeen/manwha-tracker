import { db, manhwa, sources, chapters, progress } from '@manhwa-tracker/database';
import { eq, and, sql } from 'drizzle-orm';

export class TelegramRepository {
  /**
   * All active telegram sources, joined with their manhwa title — for building the channel → manhwa map.
   * Excludes manhwa marked 'completed', 'dropped', or 'hiatus': there's nothing left to watch for
   * (or nothing expected to post right now, for hiatus), and leaving them mapped means the watcher
   * keeps advancing/read-tracking and flagging "new chapters" for a series the user isn't actively
   * following.
   */
  async getActiveTelegramSources() {
    return await db
      .select({
        sourceId: sources.id,
        manhwaId: sources.manhwaId,
        manhwaTitle: manhwa.title,
        url: sources.url,
        telegramEntityId: sources.telegramEntityId,
        telegramAccessHash: sources.telegramAccessHash,
        telegramEntityType: sources.telegramEntityType,
      })
      .from(sources)
      .innerJoin(manhwa, eq(manhwa.id, sources.manhwaId))
      .where(and(
        eq(sources.isActive, true),
        eq(sources.type, 'telegram'),
        sql`${manhwa.status} NOT IN ('completed', 'dropped')`,
      ));
  }

  /**
   * Persist the resolved entity id + accessHash + type so future watcher starts/remaps
   * can reconstruct the exact InputPeer variant instead of re-calling
   * contacts.ResolveUsername (which Telegram flood-limits hard — see .agents/brain/decisions.md).
   */
  async cacheTelegramEntity(
    sourceId: number,
    entityId: string,
    accessHash: string | null,
    entityType: 'channel' | 'chat' | 'user',
  ) {
    await db
      .update(sources)
      .set({ telegramEntityId: entityId, telegramAccessHash: accessHash, telegramEntityType: entityType })
      .where(eq(sources.id, sourceId));
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

  /**
   * Create a telegram source that already has entity info pre-resolved
   * (e.g. from a forwarded message received by the alert bot).
   * The url is set to "https://t.me/c/<entityId>" so there's a stable,
   * unique URL for the (manhwaId, url) unique constraint.
   * accessHash is initially NULL — the watcher fills it in on next remap
   * via getDialogs() (see getSourcesMissingAccessHash below).
   */
  async addTelegramSourceWithEntity(
    manhwaId: number,
    entityId: string,
    title: string,
    entityType: 'channel' | 'chat' | 'user',
  ) {
    const url = `https://t.me/c/${entityId}`;

    // CodeRabbit: Add collision check before inserting. 
    // The same telegram channel cannot be linked to multiple manhwa simultaneously.
    const [existingEntity] = await db
      .select()
      .from(sources)
      .where(eq(sources.telegramEntityId, entityId))
      .limit(1);

    if (existingEntity && existingEntity.manhwaId !== manhwaId) {
      // Collision detected. Return null to signal bot handlers.
      return null;
    }

    const [source] = await db
      .insert(sources)
      .values({
        manhwaId,
        type: 'telegram',
        url,
        adapterKey: 'telegram',
        telegramEntityId: entityId,
        // accessHash left NULL — resolved by watcher on next remap
        telegramEntityType: entityType,
      })
      .onConflictDoNothing()
      .returning();

    if (source) return source;

    // Already existed on the SAME manhwa (which is fine) — return the existing row
    const [existing] = await db
      .select()
      .from(sources)
      .where(and(eq(sources.manhwaId, manhwaId), eq(sources.url, url)))
      .limit(1);
    return existing ?? null;
  }

  /** The existing telegram source (if any) already linked to this manhwa, regardless of entityId. */
  async findTelegramSourceByManhwaId(manhwaId: number) {
    const [row] = await db
      .select()
      .from(sources)
      .where(and(eq(sources.manhwaId, manhwaId), eq(sources.type, 'telegram')))
      .limit(1);
    return row ?? null;
  }

  /**
   * Re-point an existing source at a new Telegram entity (the "replace" branch of the
   * bot's already-exists conflict flow). accessHash is reset to NULL since it belongs
   * to the old entity — the watcher re-resolves it via getDialogs() on next remap.
   */
  async updateTelegramSourceEntity(
    sourceId: number,
    entityId: string,
    entityType: 'channel' | 'chat' | 'user',
  ) {
    const url = `https://t.me/c/${entityId}`;
    const [updated] = await db
      .update(sources)
      .set({ telegramEntityId: entityId, telegramAccessHash: null, telegramEntityType: entityType, url })
      .where(eq(sources.id, sourceId))
      .returning();
    return updated ?? null;
  }

  /**
   * Returns active telegram sources that have a cached entity ID but are
   * still missing the accessHash (e.g. just added via the bot).
   * The watcher resolves these via client.getDialogs() on next remap.
   */
  async getSourcesMissingAccessHash() {
    return await db
      .select({
        sourceId: sources.id,
        manhwaId: sources.manhwaId,
        telegramEntityId: sources.telegramEntityId,
        telegramEntityType: sources.telegramEntityType,
        url: sources.url,
      })
      .from(sources)
      .where(and(
        eq(sources.isActive, true),
        eq(sources.type, 'telegram'),
        sql`${sources.telegramEntityId} IS NOT NULL`,
        sql`${sources.telegramAccessHash} IS NULL`,
        sql`${sources.telegramEntityType} = 'channel'`,
      ));
  }
}
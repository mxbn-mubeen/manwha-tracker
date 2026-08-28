import { db, manhwa, progress, chapters } from '@manhwa-tracker/database';
import { eq, sql, and, gt, isNull, inArray, desc } from 'drizzle-orm';

// Re-export so existing imports of ManhwaRepository still resolve.
// Read operations (getAll, getById) live in manhwa.read.repository.ts.
export { ManhwaReadRepository } from './manhwa.read.repository';

/**
 * Write operations for the manhwa table: create, update, delete, and chapter seeding.
 * Plain Drizzle query builder only — neon-http driver has no transaction or relational API support.
 */
export class ManhwaRepository {
  async deleteById(id: number) {
    await db.delete(manhwa).where(eq(manhwa.id, id));
  }

  async softDeleteManhwa(id: number) {
    await db.update(manhwa).set({ deletedAt: new Date() }).where(eq(manhwa.id, id));
  }

  async recoverManhwa(id: number) {
    await db.update(manhwa).set({ deletedAt: null }).where(eq(manhwa.id, id));
  }

  async getDeletedManhwa() {
    return await db.select().from(manhwa).where(sql`${manhwa.deletedAt} IS NOT NULL`).orderBy(desc(manhwa.deletedAt));
  }
  async createManual(data: {
    title: string;
    coverUrl?: string;
    description?: string;
    genres?: string[];
    status?: string;
    lastChapter?: number;
    latestChapter?: number;
  }) {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const [newManhwa] = await db
      .insert(manhwa)
      .values({
        title: data.title,
        slug,
        coverUrl: data.coverUrl,
        description: data.description,
        genres: data.genres ?? [],
        status: (data.status as 'ongoing' | 'completed' | 'hiatus' | 'dropped') ?? 'ongoing',
      })
      .onConflictDoUpdate({
        target: manhwa.slug,
        set: {
          title: data.title,
          coverUrl: data.coverUrl,
          description: data.description,
          genres: data.genres ?? [],
          status: (data.status as 'ongoing' | 'completed' | 'hiatus' | 'dropped') ?? 'ongoing',
        }
      })
      .returning();

    if (!newManhwa) throw new Error('Failed to create manhwa');

    // Always insert a progress row
    await db.insert(progress)
      .values({ manhwaId: newManhwa.id })
      .onConflictDoNothing();

    // Fetch it to ensure we have a row to update later
    const [progressRow] = await db.select().from(progress).where(eq(progress.manhwaId, newManhwa.id)).limit(1);

    // Create chapter record for latestChapter if provided
    if (data.latestChapter && data.latestChapter > 0) {
      await db.insert(chapters).values({
        manhwaId: newManhwa.id,
        chapterNum: data.latestChapter,
        title: `Chapter ${data.latestChapter}`,
        url: '',
      }).onConflictDoNothing();
    }

    // Create chapter record for lastChapter and link to progress
    if (data.lastChapter && data.lastChapter > 0 && progressRow) {
      // Reuse the latestChapter row if they're the same number
      let readChap: { id: number } | undefined;
      if (data.lastChapter === data.latestChapter) {
        const [found] = await db.select()
          .from(chapters)
          .where(and(eq(chapters.manhwaId, newManhwa.id), eq(chapters.chapterNum, data.lastChapter)))
          .limit(1);
        readChap = found;
      } else {
        const [inserted] = await db.insert(chapters).values({
          manhwaId: newManhwa.id,
          chapterNum: data.lastChapter,
          title: `Chapter ${data.lastChapter}`,
          url: '',
        })
          .onConflictDoNothing()
          .returning();

        if (inserted) {
          readChap = inserted;
        } else {
          const [found] = await db.select()
            .from(chapters)
            .where(and(eq(chapters.manhwaId, newManhwa.id), eq(chapters.chapterNum, data.lastChapter)))
            .limit(1);
          readChap = found;
        }
      }

      if (readChap) {
        await db.update(progress)
          .set({ chapterId: readChap.id, lastReadAt: new Date() })
          .where(eq(progress.id, progressRow.id));
      }
    }

    return newManhwa;
  }

  async updateStatus(id: number, status: 'ongoing' | 'completed' | 'hiatus' | 'dropped') {
    await db.update(manhwa).set({ status }).where(eq(manhwa.id, id));
  }

  /**
   * Manually set/bump the latest known chapter number, e.g. when a source missed one,
   * or to correct a previous typo (e.g. accidentally entered 266 instead of 265).
   * "Latest chapter" is derived elsewhere as MAX(chapter_num), so a stray higher row
   * left over from a mistake would otherwise keep winning forever no matter what
   * lower number gets entered afterward — this was a real bug reported directly.
   *
   * Fix: if the new value is lower than an existing MANUAL entry (sourceId IS NULL),
   * that manual entry was almost certainly the mistake being corrected right now, so
   * remove it. Genuinely scraped/Telegram-sourced chapters (sourceId NOT NULL) are
   * never touched here — only ever-manual entries can be walked back down, since a
   * real chapter someone actually posted shouldn't silently disappear just because
   * someone later typed a lower number for an unrelated reason.
   */
  async setLatestChapter(manhwaId: number, chapterNum: number) {
    const chaptersToDelete = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(
        and(
          eq(chapters.manhwaId, manhwaId),
          isNull(chapters.sourceId),
          gt(chapters.chapterNum, chapterNum),
        )
      );

    const chapterIdsToDelete = chaptersToDelete.map((c) => c.id);

    const [inserted] = await db.insert(chapters).values({
      manhwaId,
      chapterNum,
      title: `Chapter ${chapterNum}`,
      url: '',
    }).onConflictDoNothing().returning({ id: chapters.id });

    let newChapterId = inserted?.id;
    if (!newChapterId) {
      const [existing] = await db.select({ id: chapters.id }).from(chapters).where(
        and(eq(chapters.manhwaId, manhwaId), eq(chapters.chapterNum, chapterNum))
      ).limit(1);
      newChapterId = existing?.id;
    }

    if (chapterIdsToDelete.length > 0) {
      if (newChapterId) {
        await db.update(progress)
          .set({ chapterId: newChapterId })
          .where(inArray(progress.chapterId, chapterIdsToDelete));
      }
      await db.delete(chapters).where(inArray(chapters.id, chapterIdsToDelete));
    }

    // Keep this in sync with the scraper path (sync.service.ts touches
    // updatedAt on every genuinely new chapter) so manually-set chapters
    // via the bot/API also surface in "recently updated" views.
    if (inserted || chapterIdsToDelete.length > 0) {
      await db.update(manhwa).set({ updatedAt: new Date() }).where(eq(manhwa.id, manhwaId));
    }

    const [row] = await db
      .select({ max: sql<number>`MAX(${chapters.chapterNum})` })
      .from(chapters)
      .where(eq(chapters.manhwaId, manhwaId));
    return row?.max ?? chapterNum;
  }

  /** All manhwa with no cover_url set (or an empty string) — candidates for the cover backfill script. */
  async getManhwaMissingCovers() {
    return await db
      .select({
        id: manhwa.id,
        title: manhwa.title,
      })
      .from(manhwa)
      .where(sql`${manhwa.coverUrl} IS NULL OR ${manhwa.coverUrl} = ''`);
  }

  async update(id: number, data: { title?: string; coverUrl?: string; description?: string; genres?: string[] }) {
    const [updated] = await db
      .update(manhwa)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(manhwa.id, id))
      .returning();
    return updated;
  }

  async updateCoverUrl(id: number, coverUrl: string) {
    await db.update(manhwa).set({ coverUrl }).where(eq(manhwa.id, id));
  }

  // ── Convenience pass-throughs for getAll / getById ───────────────────────
  // Delegates to ManhwaReadRepository so ManhwaService doesn't need two repo instances.

  async getAll() {
    const { ManhwaReadRepository } = await import('./manhwa.read.repository');
    return new ManhwaReadRepository().getAll();
  }

  async getById(id: number) {
    const { ManhwaReadRepository } = await import('./manhwa.read.repository');
    return new ManhwaReadRepository().getById(id);
  }

  /** List every chapter row for a manhwa, newest first — powers the "manage chapters" UI. */
  async getChapters(manhwaId: number) {
    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.manhwaId, manhwaId))
      .orderBy(desc(chapters.chapterNum));
  }

  /**
   * Remove a single bad chapter row (e.g. a false-positive from the Telegram
   * watcher's fallback matcher). Deliberately does not touch progress here —
   * unlike setLatestChapter's correction path, there is no "new" chapter to
   * reassign a dangling progress.chapterId to, so the schema's own
   * onDelete: 'set null' on progress.chapterId is exactly the right behavior:
   * if someone's progress happened to point at the row being deleted, it
   * correctly reverts to "no chapter" rather than pointing at a chapter that
   * no longer exists.
   */
  async deleteChapter(chapterId: number) {
    await db.delete(chapters).where(eq(chapters.id, chapterId));
  }
}

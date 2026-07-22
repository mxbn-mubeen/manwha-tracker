import { db, manhwa, progress, chapters } from '@manhwa-tracker/database';
import { eq, sql, and } from 'drizzle-orm';

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
   * Manually set/bump the latest known chapter number, e.g. when a source missed one.
   * "Latest chapter" is derived elsewhere as MAX(chapter_num), so this just makes sure
   * a chapter row exists for the given number (no-op if it's already there). Entering
   * a number lower than the current max has no visible effect, since a higher real
   * chapter row still exists.
   */
  async setLatestChapter(manhwaId: number, chapterNum: number) {
    await db.insert(chapters).values({
      manhwaId,
      chapterNum,
      title: `Chapter ${chapterNum}`,
      url: '',
    }).onConflictDoNothing();

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
}

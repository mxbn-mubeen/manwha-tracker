import { db, manhwa, progress, sources, chapters } from '@manhwa-tracker/database';
import { eq, desc, sql, and } from 'drizzle-orm';

export class ManhwaRepository {
  async getAll() {
    // Use plain joins — Neon HTTP driver does not support the relational query API
    const rows = await db
      .select({
        id: manhwa.id,
        slug: manhwa.slug,
        title: manhwa.title,
        coverUrl: manhwa.coverUrl,
        status: manhwa.status,
        genres: manhwa.genres,
        description: manhwa.description,
        createdAt: manhwa.createdAt,
        updatedAt: manhwa.updatedAt,
        // progress
        progressId: progress.id,
        progressChapterId: progress.chapterId,
        progressLastReadAt: progress.lastReadAt,
        progressIsCompleted: progress.isCompleted,
        // latest chapter num for this manhwa
        latestChapterNum: sql<number>`(
          SELECT MAX(c.chapter_num)
          FROM chapters c
          WHERE c.manhwa_id = ${manhwa.id}
        )`.as('latestChapterNum'),
        // last read chapter num (via progress -> chapters join)
        lastReadChapterNum: sql<number>`(
          SELECT c2.chapter_num
          FROM chapters c2
          WHERE c2.id = ${progress.chapterId}
          LIMIT 1
        )`.as('lastReadChapterNum'),
        // telegram source url
        sourceUrl: sources.url,
        sourceType: sources.type,
      })
      .from(manhwa)
      .leftJoin(progress, eq(progress.manhwaId, manhwa.id))
      .leftJoin(sources, eq(sources.manhwaId, manhwa.id))
      .orderBy(desc(manhwa.updatedAt));

    // Deduplicate: a manhwa may have multiple sources, take first
    const seen = new Set<number>();
    return rows
      .filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
      .map(r => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        coverUrl: r.coverUrl,
        status: r.status,
        genres: r.genres,
        description: r.description,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        progress: r.progressId ? {
          id: r.progressId,
          lastChapter: r.lastReadChapterNum ?? 0,
          latestChapter: r.latestChapterNum ?? 0,
          isCompleted: r.progressIsCompleted,
          lastReadAt: r.progressLastReadAt,
        } : {
          lastChapter: 0,
          latestChapter: r.latestChapterNum ?? 0,
          isCompleted: false,
          lastReadAt: null,
        },
        sources: r.sourceUrl ? [{ url: r.sourceUrl, type: r.sourceType }] : [],
      }));
  }

  async getById(id: number) {
    const rows = await db
      .select({
        id: manhwa.id,
        slug: manhwa.slug,
        title: manhwa.title,
        coverUrl: manhwa.coverUrl,
        status: manhwa.status,
        genres: manhwa.genres,
        description: manhwa.description,
        createdAt: manhwa.createdAt,
        updatedAt: manhwa.updatedAt,
        progressId: progress.id,
        progressChapterId: progress.chapterId,
        progressLastReadAt: progress.lastReadAt,
        progressIsCompleted: progress.isCompleted,
        latestChapterNum: sql<number>`(
          SELECT MAX(c.chapter_num)
          FROM chapters c
          WHERE c.manhwa_id = ${manhwa.id}
        )`.as('latestChapterNum'),
        lastReadChapterNum: sql<number>`(
          SELECT c2.chapter_num
          FROM chapters c2
          WHERE c2.id = ${progress.chapterId}
          LIMIT 1
        )`.as('lastReadChapterNum'),
        sourceUrl: sources.url,
        sourceType: sources.type,
      })
      .from(manhwa)
      .where(eq(manhwa.id, id))
      .leftJoin(progress, eq(progress.manhwaId, manhwa.id))
      .leftJoin(sources, eq(sources.manhwaId, manhwa.id));

    if (rows.length === 0) return null;

    const first = rows[0];
    if (!first) return null;

    return {
      id: first.id,
      slug: first.slug,
      title: first.title,
      coverUrl: first.coverUrl,
      status: first.status,
      genres: first.genres,
      description: first.description,
      createdAt: first.createdAt,
      updatedAt: first.updatedAt,
      progress: first.progressId ? {
        id: first.progressId,
        lastChapter: first.lastReadChapterNum ?? 0,
        latestChapter: first.latestChapterNum ?? 0,
        isCompleted: first.progressIsCompleted,
        lastReadAt: first.progressLastReadAt,
      } : null,
      sources: rows.filter(r => r.sourceUrl).map(r => ({ url: r.sourceUrl, type: r.sourceType })),
    };
  }

  async deleteById(id: number) {
    await db.delete(manhwa).where(eq(manhwa.id, id));
  }

  async updateProgress(manhwaId: number, chapterNum: number) {
    let [chapterRow] = await db
      .select()
      .from(chapters)
      .where(and(eq(chapters.manhwaId, manhwaId), eq(chapters.chapterNum, chapterNum)))
      .limit(1);

    if (!chapterRow) {
      const [inserted] = await db.insert(chapters).values({
        manhwaId,
        chapterNum,
        url: '',
        title: `Chapter ${chapterNum}`,
      })
      .onConflictDoNothing()
      .returning();
      
      if (inserted) {
        chapterRow = inserted;
      } else {
        const [found] = await db
          .select()
          .from(chapters)
          .where(and(eq(chapters.manhwaId, manhwaId), eq(chapters.chapterNum, chapterNum)))
          .limit(1);
        if (!found) throw new Error("Failed to create or find chapter");
        chapterRow = found;
      }
    }

    // Update or create progress
    await db.insert(progress)
      .values({
        manhwaId,
        chapterId: chapterRow.id,
        lastReadAt: new Date(),
      })
      .onConflictDoUpdate({
        target: progress.manhwaId,
        set: {
          chapterId: chapterRow.id,
          lastReadAt: new Date(),
        },
      });
      
    return chapterRow;
  }

  async createWithSource(data: {
    title: string;
    slug: string;
    coverUrl?: string;
    description?: string;
    sourceUrl: string;
    adapterKey: string;
  }) {
    const [newManhwa] = await db
      .insert(manhwa)
      .values({
        title: data.title,
        slug: data.slug,
        coverUrl: data.coverUrl,
        description: data.description,
      })
      .onConflictDoUpdate({
        target: manhwa.slug,
        set: {
          title: data.title,
          coverUrl: data.coverUrl,
          description: data.description,
        }
      })
      .returning();

    if (!newManhwa) throw new Error("Failed to create manhwa");

    await db.insert(sources).values({
      manhwaId: newManhwa.id,
      type: 'website',
      url: data.sourceUrl,
      adapterKey: data.adapterKey,
    }).onConflictDoNothing();

    await db.insert(progress).values({
      manhwaId: newManhwa.id,
    }).onConflictDoNothing();

    return newManhwa;
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
          const [found] = await db.select().from(chapters).where(and(eq(chapters.manhwaId, newManhwa.id), eq(chapters.chapterNum, data.lastChapter))).limit(1);
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

  async addSource(manhwaId: number, url: string, type: 'telegram' | 'website') {
    // Normalise @channel to https://t.me/channel
    const normUrl = url.startsWith('@') ? `https://t.me/${url.slice(1)}` : url;
    // Resolve the real per-site adapter (asurascans/webtoon/reaperscans/manhuaus/generic)
    // for website sources so the sync flow knows which scraper to use.
    const adapterKey = type === 'telegram'
      ? 'telegram'
      : (await import('@manhwa-tracker/parser')).detectAdapterKey(normUrl);

    const [source] = await db.insert(sources).values({
      manhwaId,
      type,
      url: normUrl,
      adapterKey,
    })
      // (manhwaId, url) is unique — re-adding the same source (double-submit,
      // or re-running "Add from URL") returns the existing row instead of
      // creating a duplicate. This is what was producing two identical
      // "asurascans.com" rows under Sources.
      .onConflictDoNothing()
      .returning();

    if (source) return source;

    const [existing] = await db
      .select()
      .from(sources)
      .where(and(eq(sources.manhwaId, manhwaId), eq(sources.url, normUrl)))
      .limit(1);
    return existing ?? null;
  }

  async removeSource(manhwaId: number, url: string) {
    await db.delete(sources)
      .where(and(eq(sources.manhwaId, manhwaId), eq(sources.url, url)));
  }

  async getTelegramCount() {
    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sources)
      .where(eq(sources.type, 'telegram'));
    return Number(row?.count ?? 0);
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

  /** Also returns a manhwa's website source url (if any), for the og:image scrape fallback. */
  async getWebsiteSourceUrl(manhwaId: number): Promise<string | null> {
    const [row] = await db
      .select({ url: sources.url })
      .from(sources)
      .where(and(eq(sources.manhwaId, manhwaId), eq(sources.type, 'website')))
      .limit(1);
    return row?.url ?? null;
  }

  async update(id: number, data: { title?: string; coverUrl?: string; description?: string }) {
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
}

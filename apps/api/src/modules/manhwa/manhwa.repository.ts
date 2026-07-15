import { db, manhwa, progress, sources, chapters } from '@manhwa-tracker/database';
import { eq, desc, sql } from 'drizzle-orm';

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

  async createWithSource(data: {
    title: string;
    slug: string;
    coverUrl?: string;
    description?: string;
    sourceUrl: string;
    adapterKey: string;
  }) {
    return await db.transaction(async (tx) => {
      const [newManhwa] = await tx
        .insert(manhwa)
        .values({
          title: data.title,
          slug: data.slug,
          coverUrl: data.coverUrl,
          description: data.description,
        })
        .returning();

      await tx.insert(sources).values({
        manhwaId: newManhwa.id,
        type: 'website',
        url: data.sourceUrl,
        adapterKey: data.adapterKey,
      });

      await tx.insert(progress).values({
        manhwaId: newManhwa.id,
      });

      return newManhwa;
    });
  }
}

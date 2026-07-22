import { db, manhwa, progress, sources, chapters } from '@manhwa-tracker/database';
import { eq, desc, sql, and } from 'drizzle-orm';

/**
 * Read-only queries for manhwa — `getAll` (library list) and `getById` (detail page).
 * Kept separate because both are complex join + correlated-subquery operations that
 * are significantly longer than the write operations in ManhwaWriteRepository.
 *
 * Driver constraint: neon-http — no relational API, no transactions. Plain select only.
 */
export class ManhwaReadRepository {
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
        // first source url for display in library cards
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

    // Fetch per-source stats: the highest chapter each source has delivered and
    // when it last delivered one. Joins on source_id so chapters are attributed
    // to the exact source that found them — not all chapters for the manhwa.
    const sourceMetadata = await db
      .select({
        url: sources.url,
        latestChapterNum: sql<number>`MAX(${chapters.chapterNum})`.as('latestChapterNum'),
        lastDiscoveredAt: sql<Date>`MAX(${chapters.discoveredAt})`.as('lastDiscoveredAt'),
      })
      .from(sources)
      .leftJoin(chapters, and(eq(chapters.sourceId, sources.id), eq(chapters.manhwaId, id)))
      .where(eq(sources.manhwaId, id))
      .groupBy(sources.url);

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
      sources: rows.filter(r => r.sourceUrl).map(r => {
        const meta = sourceMetadata.find(s => s.url === r.sourceUrl);
        return {
          url: r.sourceUrl,
          type: r.sourceType,
          latestChapterNum: meta?.latestChapterNum ?? null,
          lastDiscoveredAt: meta?.lastDiscoveredAt ?? null,
        };
      }),
    };
  }
}

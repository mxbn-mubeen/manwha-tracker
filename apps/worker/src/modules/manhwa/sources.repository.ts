import { db, sources, manhwa, progress } from '@manhwa-tracker/database';
import { eq, and, sql } from 'drizzle-orm';

export class SourcesRepository {
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

  async addSource(manhwaId: number, url: string, type: 'telegram' | 'website') {
    // Normalise @channel to https://t.me/channel
    const normUrl = url.startsWith('@') ? `https://t.me/${url.slice(1)}` : url;
    // Resolve the real per-site adapter
    const adapterKey = type === 'telegram'
      ? 'telegram'
      : (await import('@manhwa-tracker/parser')).detectAdapterKey(normUrl);

    const [source] = await db.insert(sources).values({
      manhwaId,
      type,
      url: normUrl,
      adapterKey,
    })
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

  /** Also returns a manhwa's website source url (if any), for the og:image scrape fallback. */
  async getWebsiteSourceUrl(manhwaId: number): Promise<string | null> {
    const [row] = await db
      .select({ url: sources.url })
      .from(sources)
      .where(and(eq(sources.manhwaId, manhwaId), eq(sources.type, 'website')))
      .limit(1);
    return row?.url ?? null;
  }
}

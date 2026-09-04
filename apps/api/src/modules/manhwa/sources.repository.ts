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

  async getAllWithManhwa() {
    return await db
      .select({
        id: sources.id,
        manhwaId: sources.manhwaId,
        manhwaTitle: manhwa.title,
        manhwaCover: manhwa.coverUrl,
        type: sources.type,
        url: sources.url,
        adapterKey: sources.adapterKey,
        isActive: sources.isActive,
      })
      .from(sources)
      .innerJoin(manhwa, eq(manhwa.id, sources.manhwaId))
      .where(sql`${manhwa.status} != 'completed'`)
      .orderBy(manhwa.title);
  }

  async updateSourceUrl(id: number, url: string) {
    const normUrl = url.startsWith('@') ? `https://t.me/${url.slice(1)}` : url;
    
    // First find the source to know its type
    const sourceRows = await db.select({ type: sources.type }).from(sources).where(eq(sources.id, id));
    const row = sourceRows[0];
    if (!row) throw new Error("Source not found");
    const type = row.type;
    
    const adapterKey = type === 'telegram'
      ? 'telegram'
      : (await import('@manhwa-tracker/parser')).detectAdapterKey(normUrl);

    await db.update(sources)
      .set({ url: normUrl, adapterKey })
      .where(eq(sources.id, id));
  }

  async redetectAllAdapterKeys() {
    const { detectAdapterKey } = await import('@manhwa-tracker/parser');
    const allWebsite = await db
      .select({ id: sources.id, url: sources.url, adapterKey: sources.adapterKey })
      .from(sources)
      .where(eq(sources.type, 'website'));

    console.log(`\n🔧 Fix Adapters — scanning ${allWebsite.length} website sources...`);

    let fixed = 0;
    let unchanged = 0;
    const changes: string[] = [];

    for (const src of allWebsite) {
      const correct = detectAdapterKey(src.url);
      if (correct !== src.adapterKey) {
        await db.update(sources)
          .set({ adapterKey: correct })
          .where(eq(sources.id, src.id));
        changes.push(`  [${src.id}] ${src.adapterKey} → ${correct}  (${src.url})`);
        fixed++;
      } else {
        unchanged++;
      }
    }

    if (changes.length > 0) {
      console.log(`✅ Fixed ${fixed} sources:\n${changes.join('\n')}`);
    } else {
      console.log(`✅ All ${unchanged} sources already have correct adapter keys — nothing to fix.`);
    }
    console.log(`📊 Summary: ${fixed} fixed, ${unchanged} unchanged\n`);

    return { fixed, unchanged };
  }
}

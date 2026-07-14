import { db, manhwa, progress, sources } from '@manhwa-tracker/database';
import { desc } from 'drizzle-orm';

export class ManhwaRepository {
  async getAll() {
    return db.query.manhwa.findMany({
      with: {
        progress: true,
        sources: true,
      },
      orderBy: [desc(manhwa.updatedAt)],
    });
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

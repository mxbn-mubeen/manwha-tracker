import { db } from '../db';
import { manhwa, progress, chapters } from '../schema';
import { eq, and } from 'drizzle-orm';

export class ManhwaCreationRepository {
  async createManual(data: {
    title: string;
    coverUrl?: string;
    description?: string;
    genres?: string[];
    status?: string;
    lastChapter?: number;
    latestChapter?: number;
  }) {
    let baseSlug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let suffix = 1;

    let existingManhwa = await db.select({ id: manhwa.id }).from(manhwa).where(eq(manhwa.slug, slug)).limit(1);
    while (existingManhwa.length > 0) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
      existingManhwa = await db.select({ id: manhwa.id }).from(manhwa).where(eq(manhwa.slug, slug)).limit(1);
    }

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
}

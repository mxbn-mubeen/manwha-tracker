import { db, progress, chapters } from '@manhwa-tracker/database';
import { eq, and } from 'drizzle-orm';

export class ProgressRepository {
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
}

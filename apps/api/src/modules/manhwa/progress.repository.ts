import { db, progress, chapters } from '@manhwa-tracker/database';
import { eq, and } from 'drizzle-orm';

export class ProgressRepository {
  async updateProgress(manhwaId: number, chapterNum: number, userId: string) {
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

    // Update or create progress for this specific user
    await db.insert(progress)
      .values({
        userId: userId as any,
        manhwaId,
        chapterId: chapterRow.id,
        lastReadChapterNum: chapterNum,
        lastReadAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [progress.userId, progress.manhwaId],
        set: {
          chapterId: chapterRow.id,
          lastReadChapterNum: chapterNum,
          lastReadAt: new Date(),
        },
      });
      
    return chapterRow;
  }

  async startTracking(manhwaId: number, userId: string) {
    await db.insert(progress)
      .values({
        userId: userId as any,
        manhwaId,
        lastReadChapterNum: 0,
        status: 'reading',
        isCompleted: false,
      })
      .onConflictDoUpdate({
        target: [progress.userId, progress.manhwaId],
        set: {
          status: 'reading',
          isCompleted: false,
        },
      });
    return { success: true };
  }

  async stopTracking(manhwaId: number, userId: string) {
    await db.delete(progress)
      .where(and(eq(progress.manhwaId, manhwaId), eq(progress.userId, userId as any)));
    return { success: true };
  }

  async updateTrackingStatus(manhwaId: number, userId: string, status: string) {
    await db.insert(progress)
      .values({
        userId: userId as any,
        manhwaId,
        lastReadChapterNum: 0,
        status,
        isCompleted: status === 'completed',
      })
      .onConflictDoUpdate({
        target: [progress.userId, progress.manhwaId],
        set: {
          status,
          isCompleted: status === 'completed',
        },
      });
    return { success: true };
  }
}

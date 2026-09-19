import { db } from './db';
import { manhwaCovers } from './schema';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

export class CoverRepository {
  /**
   * Retrieve a cover's binary data for the given manhwa ID.
   * Returns null if no cover has been uploaded yet.
   */
  async getByManhwaId(manhwaId: number): Promise<{ coverData: Buffer; contentType: string; contentHash: string } | null> {
    const [row] = await db
      .select({
        coverData: manhwaCovers.coverData,
        contentType: manhwaCovers.contentType,
        contentHash: manhwaCovers.contentHash,
      })
      .from(manhwaCovers)
      .where(eq(manhwaCovers.manhwaId, manhwaId))
      .limit(1);
    return row ?? null;
  }

  /**
   * Upsert a compressed cover for the given manhwa.
   * data: raw image bytes (ideally already WebP-compressed by the caller).
   */
  async upsert(manhwaId: number, data: Buffer, contentType = 'image/webp') {
    const contentHash = createHash('sha1').update(data).digest('hex').slice(0, 10);
    await db
      .insert(manhwaCovers)
      .values({
        manhwaId,
        coverData: data,
        contentType,
        contentHash,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: manhwaCovers.manhwaId,
        set: {
          coverData: data,
          contentType,
          contentHash,
          updatedAt: new Date(),
        },
      });
    return contentHash;
  }

  /** Delete a cover for a manhwa (e.g. when the manhwa is removed). */
  async deleteByManhwaId(manhwaId: number) {
    await db.delete(manhwaCovers).where(eq(manhwaCovers.manhwaId, manhwaId));
  }
}

import '../env'; // Load env vars for DB connection
import { db, manhwa, chapters, progress, CoverRepository } from '@manhwa-tracker/database';
import { eq, isNull } from 'drizzle-orm';
import sharp from 'sharp';

async function main() {
  console.log('[backfill] Starting Phase 1b backfill script...');

  // 1. Backfill progress.last_read_chapter_num
  console.log('[backfill] Step 1: Populating progress.last_read_chapter_num');
  
  console.log('[backfill] Fetching progress rows...');
  const allProgress = await db.select({
    id: progress.id,
    manhwaId: progress.manhwaId,
    chapterId: progress.chapterId,
    lastReadChapterNum: progress.lastReadChapterNum
  }).from(progress);
  console.log(`[backfill] Fetched ${allProgress.length} progress rows.`);

  let progressUpdated = 0;
  for (const row of allProgress) {
    if (row.lastReadChapterNum !== null) continue; // Already backfilled
    if (row.chapterId === null) continue;
    
    // Find chapter num
    const [chap] = await db.select({ chapterNum: chapters.chapterNum })
      .from(chapters)
      .where(eq(chapters.id, row.chapterId));
      
    if (chap) {
      await db.update(progress)
        .set({ lastReadChapterNum: chap.chapterNum })
        .where(eq(progress.id, row.id));
      progressUpdated++;
    }
  }
  console.log(`[backfill] Updated ${progressUpdated} progress rows with last_read_chapter_num.`);

  // 2. Backfill covers
  console.log('[backfill] Step 2: Populating manhwa_covers from base64/URLs in cover_url');
  
  const allManhwa = await db.select({
    id: manhwa.id,
    coverUrl: manhwa.coverUrl
  }).from(manhwa);

  const coverRepo = new CoverRepository();
  let coversProcessed = 0;
  let coversSkipped = 0;
  let coversFailed = 0;

  for (const m of allManhwa) {
    if (!m.coverUrl) {
      coversSkipped++;
      continue;
    }

    try {
      let buffer: Buffer;
      if (m.coverUrl.startsWith('data:image')) {
        // Base64
        const parts = m.coverUrl.split(',');
        if (!parts[1]) throw new Error('Invalid base64 coverUrl');
        buffer = Buffer.from(parts[1], 'base64');
      } else if (m.coverUrl.startsWith('http')) {
        // External URL
        const res = await fetch(m.coverUrl);
        if (!res.ok) throw new Error(`Failed to fetch cover: ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        console.warn(`[backfill] Unknown cover format for manhwa ${m.id}: ${m.coverUrl.substring(0, 50)}...`);
        coversFailed++;
        continue;
      }

      // Convert to webp
      const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
      
      await coverRepo.upsert(m.id, webpBuffer, 'image/webp');
      coversProcessed++;
      
      console.log(`[backfill] Processed cover for manhwa ${m.id}`);
    } catch (err: any) {
      console.error(`[backfill] Failed to process cover for manhwa ${m.id}:`, err.message);
      coversFailed++;
    }
  }
  
  console.log(`[backfill] Covers processed: ${coversProcessed}, skipped: ${coversSkipped}, failed: ${coversFailed}`);
  console.log('[backfill] Done.');
  process.exit(0);
}

main().catch(err => {
  console.error('[backfill] Fatal error:', err);
  process.exit(1);
});

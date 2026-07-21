/**
 * backfill-covers.ts
 * ------------------
 * One-shot script. For every manhwa with no cover_url:
 *   1. Try MangaDex's public search API (covers almost everything, works
 *      even for Telegram-only entries with no website source).
 *   2. If that finds nothing, and the manhwa has a website source, fall
 *      back to scraping og:image from that source's URL (reuses the same
 *      parseMetadataFromUrl() the "Add from URL" flow already uses).
 *   3. Otherwise leave it as NO COVER — better than guessing wrong.
 *
 * Rate-limited (500ms between MangaDex requests) to stay well under their
 * documented ~5 req/s limit. Safe to re-run — it only touches manhwa that
 * still have no cover.
 *
 * This was written but never run against the live Neon DB / live network —
 * verify with `pnpm run backfill:covers` and check a few results before
 * assuming all 214 imported entries now have working covers.
 */
import 'dotenv/config';
import { lookupCoverUrl, parseMetadataFromUrl } from '@manhwa-tracker/parser';
import { ManhwaRepository } from '../modules/manhwa/manhwa.repository';

const DELAY_MS = 500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const repo = new ManhwaRepository();
  const missing = await repo.getManhwaMissingCovers();

  console.log(`[backfill-covers] ${missing.length} manhwa missing cover art.`);

  let foundViaMangaDex = 0;
  let foundViaScrape = 0;
  let stillMissing = 0;

  for (const [i, m] of missing.entries()) {
    process.stdout.write(`[backfill-covers] (${i + 1}/${missing.length}) "${m.title}"... `);

    let coverUrl: string | undefined;
    try {
      coverUrl = (await lookupCoverUrl(m.title)) ?? undefined;
    } catch (err) {
      console.warn(`\n[backfill-covers] Error looking up cover for "${m.title}":`, err);
    }

    if (coverUrl) {
      foundViaMangaDex++;
    } else {
      const websiteUrl = await repo.getWebsiteSourceUrl(m.id);
      if (websiteUrl) {
        try {
          const metadata = await parseMetadataFromUrl(websiteUrl);
          if (metadata.coverUrl) {
            coverUrl = metadata.coverUrl;
            foundViaScrape++;
          }
        } catch {
          // fall through to "still missing"
        }
      }
    }

    if (coverUrl) {
      await repo.updateCoverUrl(m.id, coverUrl);
      console.log('found');
    } else {
      stillMissing++;
      console.log('no match');
    }

    await sleep(DELAY_MS);
  }

  console.log(
    `[backfill-covers] Done. via MangaDex=${foundViaMangaDex} via site-scrape=${foundViaScrape} still missing=${stillMissing}`,
  );
}

main().catch((err) => {
  console.error('[backfill-covers] Fatal error:', err);
  process.exit(1);
});

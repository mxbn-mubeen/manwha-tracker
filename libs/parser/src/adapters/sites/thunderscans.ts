import type { WebsiteAdapter } from '@manhwa-tracker/shared';
import { fetchRenderedHtml } from '../browser';
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from '../utils/chapter-extract';
import { extractDeclaredChapterCount } from '../utils/extract-declared-count';
import * as cheerio from 'cheerio';

export const thunderscansAdapter: WebsiteAdapter = {
  key: 'thunderscans',
  name: 'Thunder Scans',
  urlPatterns: [/thunderscans\.com/i, /en-thunderscans\.com/i],

  async detectTitle(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: 'h1' });
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum(html) {
    // Thunderscans shows a 'N Chapters' stat widget -- the declared count is
    // the cleanest signal after the .lastend early-access widget is removed.
    return extractDeclaredChapterCount(html);
  },

  isChapterLocked(outerHtml, text) {
    // Thunderscans uses coin-locked chapters which have no href and use
    // data-coin + data-bs-target='#lockedChapterModal' as modal triggers.
    return outerHtml.includes('data-coin') || /coin|locked/i.test(text);
  },

  async chapterList(url) {
    // fetchRenderedHtml required -- full chapter list is JS-rendered.
    const html = await fetchRenderedHtml(url, {
      waitForSelector: "a[href*='chapter']",
    });
    const $ = cheerio.load(html);

    // Read the authoritative latest chapter number from .lastend BEFORE removing
    // it. .lastend holds the 'New Chapter' shortcut button -- the number shown
    // there is exactly what the site considers the current latest FREE chapter.
    // This is the primary cap: it reflects what users can actually read, not the
    // site's total chapter count (which includes coin-locked / premium chapters
    // and therefore over-counts what should be stored in the DB).
    const lastendChapterNum = readLastendChapter($);

    // Thunderscans duplicates the latest and first chapter in a div.lastend
    // at the top of the list. The latest chapter here might be coin-locked.
    // The actual free chapters are in the standard list below.
    $('.lastend').remove();
    const cleanedHtml = $.html();
    return extractChaptersFromHtml(cleanedHtml, url, {
      resolveLatestReference: (_, h) => {
        // .lastend is the primary cap — it's the site's own "New Chapter" button
        // showing the latest FREE chapter (e.g. ch63, ch138).
        // extractDeclaredChapterCount() returns the TOTAL including premium/coin
        // chapters (e.g. 83, 151) — using it here inflates the cap and lets
        // locked chapters past. Only fall back to it when .lastend was absent.
        return lastendChapterNum ?? this.extractLatestChapterNum!(h, url);
      },
      isChapterLocked: (outerHtml, text) => this.isChapterLocked!(outerHtml, text),
      lockScope: 'row',
      // disableSlugScope: ThunderScans renamed this series mid-run; old chapters
      // use one URL slug and newer chapters use a different slug derived from the
      // new title. Slug-scoped scan finds only the old half, so we disable it.
      disableSlugScope: true,
    });
  },

  async debugChapterList(url) {
    const html = await fetchRenderedHtml(url, {
      waitForSelector: "a[href*='chapter']",
    });
    const $ = cheerio.load(html);
    // Mirror chapterList() exactly so the diagnostic reflects the same logic
    const lastendChapterNum = readLastendChapter($);
    $('.lastend').remove();
    return debugExtractChapters($.html(), url, {
      resolveLatestReference: (_, h) =>
        lastendChapterNum ?? this.extractLatestChapterNum!(h, url),
      isChapterLocked: (outerHtml, text) => this.isChapterLocked!(outerHtml, text),
      lockScope: 'row',
      disableSlugScope: true,
    });
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

/**
 * Read the latest chapter number from ThunderScans' .lastend widget before
 * it is removed from the DOM. .lastend holds the 'New Chapter' and
 * 'First Chapter' shortcut buttons -- the highest-numbered chapter link
 * in it is the site's own assertion of the current latest chapter,
 * making it the most reliable cap when no 'N Chapters' stat widget is present.
 */
function readLastendChapter($: cheerio.CheerioAPI): number | null {
  const CHAP_RE = /chapter[-\/ ]?(\d+(?:\.\d+)?)/i;
  let found: number | null = null;
  $('.lastend a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const text = $(el).text().trim();
    const match = CHAP_RE.exec(text + ' ' + href);
    if (!match) return;
    const num = parseFloat(match[1]!);
    if (Number.isNaN(num)) return;
    if (found === null || num > found) found = num;
  });
  return found;
}

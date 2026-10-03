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
    // Strip "Related Series" section links. ThunderScans renders a Related
    // Series widget whose entries have a "View Latest Chapter" button linking
    // to the *series homepage* (e.g. /comics/infinite-level-up-in-murim/) not
    // a chapter URL. Because disableSlugScope is required here (series rename),
    // the extraction sees every link on the page — including these — and
    // misidentifies them as high-numbered chapters of the current series.
    // On ThunderScans, real chapter links always contain /chapter/ in the path;
    // series-homepage links never do. Removing them before extraction is safe.
    stripRelatedSeriesLinks($);
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
    stripRelatedSeriesLinks($);
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

/**
 * Remove links that point to a ThunderScans series homepage rather than a
 * specific chapter. On ThunderScans, valid chapter URLs always contain
 * '/chapter/' in their path (e.g. /comics/series-slug/chapter/42/).
 * The "Related Series" widget at the bottom of each series page renders a
 * "View Latest Chapter" button for each related series that links to the
 * series homepage (e.g. /comics/infinite-level-up-in-murim/). When
 * disableSlugScope is active these get misidentified as chapters of the
 * current series — removing them beforehand is safe and targeted.
 */
function stripRelatedSeriesLinks($: cheerio.CheerioAPI): void {
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (href.includes('/comics/') && !href.includes('/chapter/')) {
      $(el).remove();
    }
  });
}

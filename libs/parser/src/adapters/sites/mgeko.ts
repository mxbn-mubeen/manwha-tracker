import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchRenderedHtml } from "../browser";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";
import { extractDeclaredChapterCount } from "../utils/extract-declared-count";

/**
 * mgeko.com serves a bot-detection redirect page to plain HTTP fetchers —
 * the actual chapter list never appears in the static response.
 * We use the full browser renderer so the JS runs and the real page loads.
 * Mgeko uses a Madara-style theme where chapters are listed as <a> links once rendered.
 */
export const mgekoAdapter: WebsiteAdapter = {
  key: "mgeko",
  name: "Mgeko",
  urlPatterns: [/mgeko\.cc/i, /mgeko\.com/i, /mgeko\.net/i],

  async detectTitle(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "h1" });
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum(html) {
    // Mgeko renders a chapter count stat like "150-eng-li" — the regex in
    // extract-declared-count.ts is not anchored at the end so it correctly
    // reads "150" from this string. This is the most reliable signal because
    // Mgeko also renders a "Read First Chapter" CTA at the top of the page
    // which used to fool the DOM-order heuristic into thinking Ch. 1 was latest.
    return extractDeclaredChapterCount(html);
  },

  async chapterList(url) {
    // clickSelector: Mgeko shows a "Click Here to Load All Chapters" link that
    // expands the full list — without clicking it, only the initial batch is captured.
    const html = await fetchRenderedHtml(url, {
      waitForSelector: "a[href*='chapter']",
      clickSelector: "a:has-text('Load All Chapters'), a:has-text('load all'), [class*='load-all'], #load-chapters",
    });
    return extractChaptersFromHtml(html, url, {
      resolveLatestReference: (_, h) => this.extractLatestChapterNum(h, url),
    });
  },

  async debugChapterList(url) {
    const html = await fetchRenderedHtml(url, {
      waitForSelector: "a[href*='chapter']",
      clickSelector: "a:has-text('Load All Chapters'), a:has-text('load all'), [class*='load-all'], #load-chapters",
    });
    return debugExtractChapters(html, url, {
      resolveLatestReference: (_, h) => this.extractLatestChapterNum(h, url),
    });
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

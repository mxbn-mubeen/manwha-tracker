import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchRenderedHtml } from "../browser";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";
import { extractDeclaredChapterCount } from "../utils/extract-declared-count";

export const asuraScansAdapter: WebsiteAdapter = {
  key: "asurascans",
  name: "AsuraScans",
  urlPatterns: [/asuracomic\.net/i, /asurascans\.com/i, /asurascan\.com/i],

  async detectTitle(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "h1" });
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum(html) {
    // AsuraScans uses a split "N / Chapters" stat widget near the series header.
    // This is far more reliable than DOM-order because AsuraScans injects
    // EARLY ACCESS tags dynamically and uses rotating URL slugs that prevent
    // slug-scoped scanning from working. The declared count has no such issues.
    return extractDeclaredChapterCount(html);
  },

  isChapterLocked(outerHtml, text) {
    return /early access/i.test(text);
  },

  async chapterList(url) {
    // fetchRenderedHtml lets the browser run JS so EARLY ACCESS tags appear
    // in the DOM — the LOCKED_CHAPTER_INDICATOR in chapter-extract.ts then
    // filters them out naturally.
    const html = await fetchRenderedHtml(url, { waitForSelector: "a[href*='chapter']" });
    return extractChaptersFromHtml(html, url, {
      resolveLatestReference: (found, h) => this.extractLatestChapterNum(h, url),
      isChapterLocked: (outerHtml, text) => this.isChapterLocked!(outerHtml, text),
    });
  },

  async debugChapterList(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "a[href*='chapter']" });
    return debugExtractChapters(html, url);
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

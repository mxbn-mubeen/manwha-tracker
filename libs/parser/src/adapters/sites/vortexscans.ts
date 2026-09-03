import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchRenderedHtml } from "../browser";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";
import { extractDeclaredChapterCount } from "../utils/extract-declared-count";

/**
 * VortexScans (vortexscans.org) — Madara-style WordPress theme.
 * Uses JS-rendered chapter lists. Some chapters are marked as "Premium"
 * (locked/subscriber-only) and should be excluded from the sync.
 */
export const vortexScansAdapter: WebsiteAdapter = {
  key: "vortexscans",
  name: "Vortexscans",
  urlPatterns: [/vortexscans\.org/i, /vortexscans\.com/i],

  async detectTitle(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "h1" });
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum(html) {
    // VortexScans uses Madara's standard chapter count stat widget.
    return extractDeclaredChapterCount(html);
  },

  isChapterLocked(outerHtml, text) {
    // VortexScans marks premium/paywalled chapters with a lock icon SVG,
    // a "Premium" label, or a lock emoji (🔒).
    return (
      outerHtml.includes('data-premium') ||
      outerHtml.includes('class="premium') ||
      outerHtml.includes('"premium"') ||
      outerHtml.includes('d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75') || // Lock SVG path
      /premium|🔒|locked/i.test(text)
    );
  },

  async chapterList(url) {
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

import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";

/**
 * Fallback adapter used for any website source that doesn't match a
 * dedicated adapter's urlPatterns. Relies entirely on the markup-agnostic
 * chapter-link scan, so accuracy depends on the target site's structure.
 */
export const genericAdapter: WebsiteAdapter = {
  key: "generic",
  name: "Generic",
  urlPatterns: [/.*/],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum() {
    // By design: generic is the fallback for unknown sites.
    // Both shared heuristics (declared-count stat → DOM-order) are appropriate.
    return null;
  },

  async chapterList(url) {
    const html = await fetchHtml(url);
    return extractChaptersFromHtml(html, url, {
      resolveLatestReference: (found, h) => this.extractLatestChapterNum(h, url),
    });
  },

  async debugChapterList(url) {
    const html = await fetchHtml(url);
    return debugExtractChapters(html, url);
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";
import { extractDeclaredChapterCount } from "../utils/extract-declared-count";

export const manhuausAdapter: WebsiteAdapter = {
  key: "manhuaus",
  name: "Manhuaus",
  urlPatterns: [/manhuaus\.com/i],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum(html) {
    // No known quirks on this site, but declaring this explicitly means any
    // future site-specific issue can be fixed here without touching shared code.
    return extractDeclaredChapterCount(html);
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

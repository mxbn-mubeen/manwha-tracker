import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";

export const reaperScansAdapter: WebsiteAdapter = {
  key: "reaperscans",
  name: "Reaper Scans",
  urlPatterns: [/reaperscans\.com/i],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum() {
    // No known quirks — generic heuristic (declared-count → DOM-order) works correctly.
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

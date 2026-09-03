import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";

export const webtoonAdapter: WebsiteAdapter = {
  key: "webtoon",
  name: "Webtoon",
  urlPatterns: [/webtoons\.com/i],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum() {
    // Webtoon lists episodes rather than chapters — the generic extractor
    // also matches "Episode"/"Ep" link text. No known count issues.
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

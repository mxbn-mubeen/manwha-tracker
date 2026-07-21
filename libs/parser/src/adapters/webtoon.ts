import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "./http";
import { detectTitleFromHtml, extractChaptersFromHtml } from "./chapter-extract";

export const webtoonAdapter: WebsiteAdapter = {
  key: "webtoon",
  name: "Webtoon",
  urlPatterns: [/webtoons\.com/i],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
  },

  async chapterList(url) {
    const html = await fetchHtml(url);
    // Webtoon lists episodes rather than "chapters" — the generic extractor
    // also matches "Episode"/"Ep" so it covers this site's link text too.
    return extractChaptersFromHtml(html, url);
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

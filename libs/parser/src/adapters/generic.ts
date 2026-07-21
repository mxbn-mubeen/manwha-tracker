import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "./http";
import { detectTitleFromHtml, extractChaptersFromHtml } from "./chapter-extract";

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

  async chapterList(url) {
    const html = await fetchHtml(url);
    return extractChaptersFromHtml(html, url);
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

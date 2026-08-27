import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchRenderedHtml } from "../browser";
import { detectTitleFromHtml, extractChaptersFromHtml } from "../utils/chapter-extract";

/**
 * mgeko.com serves a bot-detection redirect page to plain HTTP fetchers —
 * the actual chapter list never appears in the static response.
 * We use the full browser renderer so the JS runs and the real page loads.
 * Mgeko uses a Madara-style theme where chapters are listed as <a> links once rendered.
 */
export const mgekoAdapter: WebsiteAdapter = {
  key: "mgeko",
  name: "Mgeko",
  urlPatterns: [/mgeko\.cc/i, /mgeko\.com/i],

  async detectTitle(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "h1" });
    return detectTitleFromHtml(html);
  },

  async chapterList(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "a[href*='chapter']" });
    return extractChaptersFromHtml(html, url);
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

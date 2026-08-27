import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchRenderedHtml } from "../browser";
import { detectTitleFromHtml, extractChaptersFromHtml } from "../utils/chapter-extract";

/**
 * theultimateofallages.com uses a Madara-like theme where the chapter list
 * is sometimes populated dynamically via AJAX. We use the browser renderer
 * to ensure all chapters are loaded.
 */
export const ultimateOfAllAgesAdapter: WebsiteAdapter = {
  key: "ultimateofallages",
  name: "Ultimate of All Ages",
  urlPatterns: [/theultimateofallages\.com/i],
  
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

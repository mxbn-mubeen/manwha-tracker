import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchRenderedHtml } from "../browser";
import { detectTitleFromHtml, extractChaptersFromHtml } from "../utils/chapter-extract";

/**
 * roliascan.com ships literally the string "Loading chapters..." in its raw
 * HTML — confirmed earlier, the chapter list is entirely AJAX-populated
 * after page load. Same browser-rendering approach as comix.to.
 */
export const roliascanAdapter: WebsiteAdapter = {
  key: "roliascan",
  name: "RoliaScan",
  urlPatterns: [/^https?:\/\/(?:www\.)?roliascan\.com(?:[/:?#]|$)/i],
  async detectTitle(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "h1" });
    return detectTitleFromHtml(html);
  },

  async chapterList(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "a[href*=ch]" });
    return extractChaptersFromHtml(html, url);
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};
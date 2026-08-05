import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchRenderedHtml } from "../browser";
import {
  detectTitleFromHtml,
  extractChaptersFromHtml,
} from "../utils/chapter-extract";

/**
 * comix.to is a client-side-rendered SPA — confirmed earlier that a plain
 * HTTP fetch gets an empty shell with no chapter data at all. Needs a real
 * browser to render. See browser.ts for the "why playwright-core, why not
 * paginate the full archive" reasoning.
 */
export const comixToAdapter: WebsiteAdapter = {
  key: "comixto",
  name: "Comix.to",
  // Match only when the URL authority is exactly `comix.to` (with optional
  // `www.`) to avoid false positives when `comix.to` appears elsewhere in
  // the path, query, or fragment. Anchor to scheme+authority and require a
  // hostname boundary.
  urlPatterns: [/^https?:\/\/(?:www\.)?comix\.to(?:[/:?#]|$)/i],

  async detectTitle(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "h1" });
    return detectTitleFromHtml(html);
  },

  async chapterList(url) {
    const html = await fetchRenderedHtml(url, {
      waitForSelector: "[class*=chapter], a[href*=chapter]",
    });
    return extractChaptersFromHtml(html, url);
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

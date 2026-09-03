import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import * as cheerio from "cheerio";
import { fetchRenderedHtml } from "../browser";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";
import { extractChapterNumber } from "../utils/extract-chapter-number";
import { deriveSlug } from "../utils/derive-slug";

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

  extractLatestChapterNum(html, url) {
    // This site renders a prominent "Read First Chapter" CTA button at the
    // very top of the page — well above the real chapter list. That single
    // Ch.1 link was enough to make the DOM-order heuristic trim 560+ real
    // chapters down to just chapter 1. Fix: skip the first slug-scoped link
    // entirely and return the max of the remainder, which is the true latest.
    const $ = cheerio.load(html);
    const slug = deriveSlug(url);
    const nums: number[] = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href') ?? '';
      if (slug && !`${href}`.toLowerCase().includes(slug.toLowerCase())) return;
      const text = $(el).text().trim();
      const num = extractChapterNumber(`${text} ${href}`);
      if (num != null && !Number.isNaN(num)) nums.push(num);
    });
    // Drop the minimum (likely the "Read Ch. 1" CTA) and take the max of what remains.
    // If only one link was found, trust it — no CTA to skip.
    if (nums.length === 0) return null;
    if (nums.length === 1) return nums[0] ?? null;
    const sorted = [...nums].sort((a, b) => a - b);
    sorted.shift(); // remove the lowest (CTA chapter)
    return Math.max(...sorted);
  },

  async chapterList(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "a[href*='chapter']" });
    return extractChaptersFromHtml(html, url, {
      resolveLatestReference: (found, h) => this.extractLatestChapterNum(h, url),
    });
  },

  async debugChapterList(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "a[href*='chapter']" });
    return debugExtractChapters(html, url);
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

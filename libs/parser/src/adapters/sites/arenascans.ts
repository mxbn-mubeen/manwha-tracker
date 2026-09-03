import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import * as cheerio from "cheerio";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";
import { extractChapterNumber } from "../utils/extract-chapter-number";
import { deriveSlug } from "../utils/derive-slug";

export const arenaScansAdapter: WebsiteAdapter = {
  key: "arenascans",
  name: "Arenascan",
  urlPatterns: [/arenascan\.com/i],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum(html, url) {
    // Arena Scans has had reversed button order — a "Read Chapter 1" CTA link
    // appears before the real chapter list in DOM order. Taking the max of the
    // first 5 DOM-order slug-scoped links bypasses this CTA safely.
    const $ = cheerio.load(html);
    const slug = deriveSlug(url);
    const nums: number[] = [];
    $('a').each((_, el) => {
      if (nums.length >= 5) return false;
      const href = $(el).attr('href') ?? '';
      if (slug && !`${href}`.toLowerCase().includes(slug.toLowerCase())) return;
      const text = $(el).text().trim();
      const num = extractChapterNumber(`${text} ${href}`);
      if (num != null && !Number.isNaN(num)) nums.push(num);
    });
    return nums.length > 0 ? Math.max(...nums) : null;
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

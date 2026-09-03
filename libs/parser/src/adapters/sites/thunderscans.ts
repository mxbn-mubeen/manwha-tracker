import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";
import { extractDeclaredChapterCount } from "../utils/extract-declared-count";
import * as cheerio from "cheerio";

export const thunderscansAdapter: WebsiteAdapter = {
  key: "thunderscans",
  name: "Thunder Scans",
  urlPatterns: [/thunderscans\.com/i, /en-thunderscans\.com/i],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum(html) {
    // Thunderscans shows a "N Chapters" stat widget — the declared count is
    // the cleanest signal after the .lastend early-access widget is removed.
    return extractDeclaredChapterCount(html);
  },

  isChapterLocked(outerHtml, text) {
    // Thunderscans uses coin-locked chapters which have no href and use
    // data-coin + data-bs-target="#lockedChapterModal" as modal triggers.
    // They also might say 'coin', '🪙', or 'locked'.
    return outerHtml.includes("data-coin") || /coin|🪙|locked/i.test(text);
  },

  async chapterList(url) {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    // Thunderscans duplicates the latest and first chapter in a <div class="lastend">
    // at the top of the list. The latest chapter here might be coin-locked (early access).
    // The actual free chapters are in the standard list below.
    // By removing this div, we ignore the early access chapter entirely and only parse the regular list.
    $('.lastend').remove();
    const cleanedHtml = $.html();
    return extractChaptersFromHtml(cleanedHtml, url, {
      resolveLatestReference: (found, h) => this.extractLatestChapterNum(h, url),
      isChapterLocked: (outerHtml, text) => this.isChapterLocked!(outerHtml, text),
    });
  },

  async debugChapterList(url) {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    $('.lastend').remove(); // mirror chapterList()'s DOM surgery so the diagnostic reflects the same input
    return debugExtractChapters($.html(), url);
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

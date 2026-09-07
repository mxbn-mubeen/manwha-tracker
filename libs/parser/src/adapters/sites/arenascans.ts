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

  extractLatestChapterNum() {
    // No custom override needed — the shared pipeline's generic heuristic
    // (max of first 5 slug-scoped links) already handles the Arena Scans CTA
    // ordering correctly. Returning null falls through to that shared logic.
    return null;
  },

  async chapterList(url) {
    const html = await fetchHtml(url);
    return extractChaptersFromHtml(html, url, {
      resolveLatestReference: (_, h) => this.extractLatestChapterNum(h, url),
    });
  },

  async debugChapterList(url) {
    const html = await fetchHtml(url);
    return debugExtractChapters(html, url, {
      resolveLatestReference: (_, h) => this.extractLatestChapterNum(h, url),
    });
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

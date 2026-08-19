import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml } from "../utils/chapter-extract";

/** AsuraScans early-access window. Chapters are locked for up to 6 hours after upload. */
const EARLY_ACCESS_WINDOW_MS = 6 * 60 * 60 * 1000;

export const asuraScansAdapter: WebsiteAdapter = {
  key: "asurascans",
  name: "AsuraScans",
  urlPatterns: [/asuracomic\.net/i, /asurascans\.com/i, /asurascan\.com/i],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
  },

  async chapterList(url) {
    const html = await fetchHtml(url);
    const list = extractChaptersFromHtml(html, url);
    const now = Date.now();
    // Filter chapters still within the early-access window (posted < 6h ago).
    // AsuraScans locks chapters behind a paywall for the first 6 hours — the
    // badge is injected via JS so server-side scraping can't see it, but we
    // can detect it via the relative timestamp.
    return list.filter(
      (c) => !c.publishedAt || now - c.publishedAt.getTime() >= EARLY_ACCESS_WINDOW_MS
    );
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    const now = Date.now();
    // Skip chapters still within the early-access window (posted < 6h ago).
    // AsuraScans injects the "EARLY ACCESS" badge via JS only — our server-side
    // scraper can't see it, but we can see the relative "1 hour ago" timestamp.
    const freeChapter = list.find(
      (c) => !c.publishedAt || now - c.publishedAt.getTime() >= EARLY_ACCESS_WINDOW_MS
    );
    return freeChapter ?? null;
  },
};


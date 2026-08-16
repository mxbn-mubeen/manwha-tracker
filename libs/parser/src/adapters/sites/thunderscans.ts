import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml } from "../utils/chapter-extract";

export const thunderscansAdapter: WebsiteAdapter = {
  key: "thunderscans",
  name: "Thunder Scans",
  urlPatterns: [/thunderscans\.com/i, /en-thunderscans\.com/i],

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
    if (list.length === 0) return null;

    // Thunderscans shows a single teaser link for the newest paid chapter (e.g. Ch.67),
    // but hides all the other paid chapters (Ch.61-66) entirely from the HTML (or they are data-coin modals).
    // This creates a visible gap in our parsed list: first chapter = 67, second = 60 (gap of 7).
    // A gap > 1 between the top chapter and the next means the top chapter is paid.
    // Skip it and return the first chapter without a gap above it.
    for (let i = 0; i < list.length - 1; i++) {
      const current = list[i];
      const next = list[i + 1];
      if (!current || !next) continue;

      const gap = current.chapterNum - next.chapterNum;
      if (gap <= 1) {
        // current is continuous with the one below — it's the latest free chapter
        return current;
      }
    }

    // No gaps found: all chapters are free, return the top one
    return list[0] ?? null;
  },
};


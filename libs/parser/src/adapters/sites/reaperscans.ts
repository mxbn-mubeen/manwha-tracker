import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml } from "../utils/chapter-extract";

export const reaperScansAdapter: WebsiteAdapter = {
  key: "reaperscans",
  name: "Reaper Scans",
  urlPatterns: [/reaperscans\.com/i],

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
    return list[0] ?? null;
  },
};

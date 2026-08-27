import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml } from "../utils/chapter-extract";
import * as cheerio from "cheerio";

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
    const $ = cheerio.load(html);
    // Thunderscans duplicates the latest and first chapter in a <div class="lastend">
    // at the top of the list. The latest chapter here might be coin-locked (early access).
    // The actual free chapters are in the standard list below.
    // By removing this div, we ignore the early access chapter entirely and only parse the regular list.
    $('.lastend').remove();
    return extractChaptersFromHtml($.html(), url);
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};


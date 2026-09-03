import type { WebsiteAdapter, ChapterInfo } from "@manhwa-tracker/shared";
import * as cheerio from "cheerio";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters, extractChapterNumber, parseRelativeTime } from "../utils/chapter-extract";
import { fetchHtml } from "../http";

export const mgreadAdapter: WebsiteAdapter = {
  key: "mgread",
  name: "MGRead",
  urlPatterns: [/mgread\.io/i],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum(html) {
    // MGRead uses a dedicated .chapter-item list — scan only those elements
    // to get the chapter numbers, then return the max. This is identical to
    // chapterList()'s own scoped scan, so the two can never disagree.
    const $ = cheerio.load(html);
    let max: number | null = null;
    $(".chapter-item a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      const titleText = $(el).find(".uk-link-heading").text().trim();
      const num = extractChapterNumber(titleText) ?? extractChapterNumber(href);
      if (num != null && !Number.isNaN(num)) {
        max = max === null ? num : Math.max(max, num);
      }
    });
    return max;
  },

  async chapterList(url) {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const chapters: ChapterInfo[] = [];
    const found = new Set<number>();

    // Select only the links in the chapter list to avoid the "Read (Chapter 1)" button at the top
    $(".chapter-item a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const titleText = $(el).find(".uk-link-heading").text().trim();
      const num = extractChapterNumber(titleText) ?? extractChapterNumber(href);
      if (num == null || Number.isNaN(num) || found.has(num)) return;

      const dateText = $(el).find("time").text().trim();
      const publishedAt = parseRelativeTime(dateText) || undefined;

      // MGRead URLs are already absolute, but resolve just in case
      let resolvedUrl = href;
      try {
        resolvedUrl = new URL(href, url).toString();
      } catch {
        // ignore
      }

      found.add(num);
      chapters.push({
        chapterNum: num,
        title: titleText || `Chapter ${num}`,
        url: resolvedUrl,
        publishedAt: publishedAt || null,
      });
    });

    return chapters;
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

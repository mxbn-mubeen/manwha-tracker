import type { WebsiteAdapter, ChapterInfo } from "@manhwa-tracker/shared"
import * as cheerio from "cheerio";
import { detectTitleFromHtml, extractChapterNumber, parseRelativeTime } from "../utils/chapter-extract";
import { fetchHtml } from "../http";

export const mgreadAdapter: WebsiteAdapter = {
  key: "mgread",
  name: "MGRead",
  urlPatterns: [/mgread\.io/i],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
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
      const num = extractChapterNumber(titleText) || extractChapterNumber(href);
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

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml } from "../utils/chapter-extract";

export const infiniteLevelUpAdapter: WebsiteAdapter = {
  key: "infinitelevelup",
  name: "Infinite Level Up In Murim",
  urlPatterns: [/infinitelevelup\.com/i],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
  },

  async chapterList(url) {
    const html = await fetchHtml(url);
    const list = extractChaptersFromHtml(html, url);

    // Filter out dummy chapters at the top (like Chapter 277)
    // A real chapter will have dozens of images, while a dummy has only ~4 share buttons.
    while (list.length > 0) {
      const topChapter = list[0];
      if (!topChapter || !topChapter.url) {
        list.shift();
        continue;
      }

      try {
        const chapterHtml = await fetchHtml(topChapter.url);
        // Count rough <img occurrences
        const imgCount = (chapterHtml.match(/<img/gi) || []).length;
        if (imgCount > 10) {
          // Found a real chapter with images!
          break;
        }
        // Dummy chapter, remove it and check the next one
        console.log(`[infinitelevelup] Skipping dummy chapter: ${topChapter.chapterNum}`);
        list.shift();
      } catch (err) {
        // If fetch fails, we can either break or skip. Skipping is safer for one-off broken links,
        // but breaking is safer to not accidentally skip a real chapter that's just rate-limited.
        console.warn(`[infinitelevelup] Failed to verify chapter ${topChapter.chapterNum}, assuming real`);
        break;
      }
    }

    return list;
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

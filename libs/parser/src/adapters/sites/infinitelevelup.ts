import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchHtml } from "../http";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";

export const infiniteLevelUpAdapter: WebsiteAdapter = {
  key: "infinitelevelup",
  name: "Infinite Level Up In Murim",
  urlPatterns: [/infinitelevelup\.com/i],

  async detectTitle(url) {
    const html = await fetchHtml(url);
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum(html, url) {
    // infinitelevelup.com has "dummy" chapters at the top — stub pages with
    // only ~4 share buttons and no real images. The real chapter filtering
    // happens in chapterList() by fetching each candidate chapter to count
    // its images. For the reference number we just take the max from the
    // shared pipeline's scan — the dummy chapter gets removed by chapterList()
    // before any decisions are made, so this reference is only used to cap
    // the outlier filter, not to select the final result.
    return null; // let shared heuristic run; chapterList() handles dummy removal
  },

  async chapterList(url) {
    const html = await fetchHtml(url);
    const list = await (async () => extractChaptersFromHtml(html, url, {
      resolveLatestReference: (found, h) => this.extractLatestChapterNum(h, url),
    }))();

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
        const imgCount = (chapterHtml.match(/<img/gi) || []).length;
        if (imgCount > 10) {
          break; // Found a real chapter with images!
        }
        console.log(`[infinitelevelup] Skipping dummy chapter: ${topChapter.chapterNum}`);
        list.shift();
      } catch (err) {
        console.warn(`[infinitelevelup] Failed to verify chapter ${topChapter.chapterNum}, assuming real`);
        break;
      }
    }

    return list;
  },

  async debugChapterList(url) {
    const html = await fetchHtml(url);
    // Returns the shared extraction breakdown only — not re-running the
    // dummy-chapter filtering loop above, since that's this adapter's own
    // extra logic, not part of the shared pipeline this diagnostic covers.
    return debugExtractChapters(html, url);
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

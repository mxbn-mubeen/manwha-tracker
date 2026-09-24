import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchRenderedHtml } from "../browser";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";
import { extractDeclaredChapterCount } from "../utils/extract-declared-count";

export const asuraScansAdapter: WebsiteAdapter = {
  key: "asurascans",
  name: "AsuraScans",
  urlPatterns: [/asuracomic\.net/i, /asurascans\.com/i, /asurascan\.com/i],

  async detectTitle(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "h1" });
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum(html) {
    // AsuraScans uses a split "N / Chapters" stat widget near the series header.
    // This is far more reliable than DOM-order because AsuraScans injects
    // EARLY ACCESS tags dynamically and uses rotating URL slugs that prevent
    // slug-scoped scanning from working. The declared count has no such issues.
    return extractDeclaredChapterCount(html);
  },

  isChapterLocked(outerHtml, text) {
    if (/early access/i.test(text)) return true;
    // Lock badges are often icon-only (an <svg>, no visible text), or carry the
    // word only in a class / aria-label / title. Look at the TAGS only, with
    // href/src removed, so a series slug like "the-lock-..." can't trip this.
    const tags = (outerHtml.match(/<[^>]+>/g) ?? [])
      .join(" ")
      .replace(/\s(?:href|src|srcset|data-src)="[^"]*"/gi, "");
    // Use (?<![a-z]) instead of \b before 'lock' so hyphenated class names like
    // 'chapter-locked-row' or 'lock-icon' are still caught (\b fails there because
    // '-' is not a word character, so \b sees no boundary between '-' and 'l').
    return /early[-_ ]?access|padlock|(?<![a-z])lock(?:ed)?(?![a-z])|data-coin|\bcoins?\b/i.test(tags);
  },

  async chapterList(url) {
    // fetchRenderedHtml lets the browser run JS so EARLY ACCESS tags appear
    // in the DOM — the LOCKED_CHAPTER_INDICATOR in chapter-extract.ts then
    // filters them out naturally.
    const html = await fetchRenderedHtml(url, { waitForSelector: "a[href*='chapter']" });
    return extractChaptersFromHtml(html, url, {
      resolveLatestReference: (_, h) => this.extractLatestChapterNum(h, url),
      isChapterLocked: (outerHtml, text) => this.isChapterLocked!(outerHtml, text),
      lockScope: "row",
    });
  },

  async debugChapterList(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "a[href*='chapter']" });
    return debugExtractChapters(html, url, {
      resolveLatestReference: (_, h) => this.extractLatestChapterNum(h, url),
      isChapterLocked: (outerHtml, text) => this.isChapterLocked!(outerHtml, text),
      lockScope: "row",
    });
  },

  async latestChapter(url) {
    const list = await this.chapterList(url);
    return list[0] ?? null;
  },
};

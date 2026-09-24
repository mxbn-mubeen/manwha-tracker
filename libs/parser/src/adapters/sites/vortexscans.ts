import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchRenderedHtml } from "../browser";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";
import { extractDeclaredChapterCount } from "../utils/extract-declared-count";

/**
 * VortexScans (vortexscans.org) — Madara-style WordPress theme.
 * Uses JS-rendered chapter lists. Some chapters are marked as "Premium"
 * (locked/subscriber-only) and should be excluded from the sync.
 */
export const vortexScansAdapter: WebsiteAdapter = {
  key: "vortexscans",
  name: "Vortexscans",
  urlPatterns: [/vortexscans\.org/i, /vortexscans\.com/i],

  async detectTitle(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "h1" });
    return detectTitleFromHtml(html);
  },

  extractLatestChapterNum(html) {
    // VortexScans uses Madara's standard chapter count stat widget.
    return extractDeclaredChapterCount(html);
  },

  isChapterLocked(outerHtml, text) {
    // Signals confirmed by live HTML inspection of vortex-raw.html (2026-09-24):
    //
    // LOCKED chapters have:
    //   1. class="...text-yellow-600..." or class="...text-yellow-500..."
    //      → the coin-count badge wrapper (e.g. <div class="flex items-center gap-1.5 text-yellow-600 ...">)
    //   2. A padlock SVG overlay on the thumbnail with path starting "M12 1.5a5.25 5.25 0 0 0-5.25 5.25"
    //      → rendered as <div class="absolute inset-0 bg-black/50 ..."><svg ...><path .../></svg></div>
    //
    // FREE chapters that just became free have:
    //   class="lucide lucide-lock-open ..."  ← open padlock = "Free now" badge
    //   This MUST be excluded — it trips the naive /lock/i class check and causes false positives.
    //
    // Kept as defence-in-depth for older Madara-style pages that may still use data-coin / data-premium:
    //   data-coin, data-premium

    // Exclude the open-padlock "Free now" badge from triggering lock detection
    if (/lucide-lock-open/i.test(outerHtml)) return false;

    return (
      // Coin badge: yellow wrapper around the SVG coin icon + count number
      /class="[^"]*text-yellow-(?:600|500)/i.test(outerHtml) ||
      // Padlock SVG overlay on the chapter thumbnail (closed lock path, unique to locked chapters)
      outerHtml.includes("M12 1.5a5.25 5.25 0 0 0-5.25 5.25") ||
      // Legacy Madara data attributes (older page style, kept as fallback)
      /data-coin|data-premium/i.test(outerHtml) ||
      // Plain text indicators (timer-locked early-access chapters)
      /available in|unlocks in|releases in/i.test(text)
    );
  },


  async chapterList(url) {
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

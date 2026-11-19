import type { WebsiteAdapter } from "@manhwa-tracker/shared";
import { fetchRenderedHtml, fetchRenderedHtmlWithUrl } from "../browser";
import { detectTitleFromHtml, extractChaptersFromHtml, debugExtractChapters } from "../utils/chapter-extract";
import { extractDeclaredChapterCount } from "../utils/extract-declared-count";

/**
 * Symbol used to attach the canonical URL that FlareSolverr/Playwright resolved
 * after following redirects. The sync processor reads this off the returned array
 * and writes it back to sources.url so stale hashes self-heal on the next sync.
 */
export const ASURA_CANONICAL_URL = Symbol("asuraCanonicalUrl");

/**
 * Normalize any Asura URL before fetching:
 *   1. Rewrite legacy asuracomic.net/series/ → asurascans.com/comics/ so stale
 *      domain redirects are handled before we even hit the network.
 *   2. Strip the rotating 8-hex-char hash suffix (e.g. -f886a8af) so Asura's
 *      own redirect logic lands us on the current canonical page rather than
 *      redirecting to the catalog homepage (which has no lock badges visible).
 */
function normalizeAsuraUrl(url: string): string {
  url = url.replace(/asuracomic\.net\/series\//i, "asurascans.com/comics/");
  return url.replace(/-[a-f0-9]{8}(\/?)$/i, "$1");
}

/** True when the final URL indicates Asura redirected us to the catalog homepage. */
function isHomepageRedirect(finalUrl: string): boolean {
  // Matches https://asurascans.com/comics or https://asurascans.com/comics/
  // but NOT https://asurascans.com/comics/some-slug-7ba78ec7
  return /asurascans\.com\/comics\/?$/.test(finalUrl);
}

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
    // Match text visible in the chapter row: "Early Access", "Premium", "Asura+", "Unlocks in", etc.
    if (/early.?access|premium|\basura\+|unlocks? in/i.test(text)) return true;
    // Lock badges are often icon-only (an <svg>, no visible text), or carry the
    // word only in a class / aria-label / title. Look at the TAGS only, with
    // href/src removed, so a series slug like "the-lock-..." can't trip this.
    const tags = (outerHtml.match(/<[^>]+>/g) ?? [])
      .join(" ")
      .replace(/\s(?:href|src|srcset|data-src)="[^"]*"/gi, "");
    // Use (?<![a-z]) instead of \b before 'lock' so hyphenated class names like
    // 'chapter-locked-row' or 'lock-icon' are still caught (\b fails there because
    // '-' is not a word character, so \b sees no boundary between '-' and 'l').
    return /early[-_ ]?access|padlock|(?<![a-z])lock(?:ed)?(?![a-z])|data-coin|\bcoins?\b|premium|asura[\-_+]?plus?|asura-plus/i.test(tags);
  },

  async chapterList(url) {
    // Strip rotating hash so Asura redirects to the canonical series page
    // instead of the catalog homepage (which has no lock badges).
    const fetchUrl = normalizeAsuraUrl(url);

    const { html, finalUrl } = await fetchRenderedHtmlWithUrl(fetchUrl, {
      waitForSelector: "a[href*='chapter']",
    });

    // Guard: if Asura sent us to the catalog homepage, refuse to parse it.
    // Catalog cards have no "Early Access" badges, so parsing them would produce
    // false-positive free chapters. Throw so the sync loop records an error
    // rather than silently inserting locked chapters.
    if (isHomepageRedirect(finalUrl) || html.includes("Read Manga, Manhwa")) {
      throw new Error(
        `AsuraScans: URL redirected to catalog homepage — cannot determine chapters. ` +
        `DB URL may need renewal: ${url}`
      );
    }

    // Use hashless URL for slug-scoped chapter link matching so chapter anchors
    // are correctly matched regardless of which hash generation is in the DB.
    const slugScopeUrl = normalizeAsuraUrl(url);

    const chapters = extractChaptersFromHtml(html, slugScopeUrl, {
      resolveLatestReference: (_, h) => this.extractLatestChapterNum(h, url),
      isChapterLocked: (outerHtml, text) => this.isChapterLocked!(outerHtml, text),
      lockScope: "row",
    });

    // Attach the canonical URL so the sync processor can write it back to the
    // sources table, healing stale hashes on first successful sync after the fix.
    (chapters as any)[ASURA_CANONICAL_URL] = finalUrl;

    return chapters;
  },

  async debugChapterList(url) {
    const html = await fetchRenderedHtml(url, { waitForSelector: "a[href*='chapter']" });
    const slugScopeUrl = normalizeAsuraUrl(url);

    return debugExtractChapters(html, slugScopeUrl, {
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

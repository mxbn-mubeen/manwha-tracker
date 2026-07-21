import * as cheerio from "cheerio";
import type { ChapterInfo } from "@manhwa-tracker/shared";

// Matches "Chapter 123", "Ch. 45.5", "Episode 12", "Ep 8" in link text or hrefs
const CHAPTER_REGEX = /\b(?:chapter|chap\.?|ch\.?|episode|ep\.?)\s*#?\s*(\d+(?:\.\d+)?)/i;

const SITE_SUFFIX_REGEX =
  /\s*[-|]\s*(Asura ?Scans?|Webtoons?|Reaper ?Scans?|Manhuaus?|Read (Online|Free)).*$/i;

/**
 * Extract a single chapter number from free text — a message caption,
 * a document filename, a link title, etc. Returns null if nothing matches.
 * Shared by website adapters and the Telegram download-watcher so chapter
 * parsing logic lives in exactly one place.
 */
export function extractChapterNumber(text: string): number | null {
  const match = text.match(CHAPTER_REGEX);
  if (!match || !match[1]) return null;
  const num = parseFloat(match[1]);
  return Number.isNaN(num) ? null : num;
}

/**
 * Derive a series slug from its page URL to scope chapter extraction —
 * e.g. "https://asurascans.com/series/my-slain-dragon-bride/" -> "my-slain-dragon-bride".
 * Reader sites almost universally embed the series slug in both the series
 * page URL and every one of its own chapter URLs, so requiring the slug to
 * appear in a candidate link's href is a strong, markup-agnostic way to
 * reject links that belong to a *different* series entirely.
 */
function deriveSlug(baseUrl: string): string | null {
  try {
    const { pathname } = new URL(baseUrl);
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    // Prefer the last segment; if it looks like a chapter marker itself
    // (e.g. the source URL points straight at a chapter), fall back to the
    // segment before it.
    const last = segments[segments.length - 1] ?? '';
    if (/^(chapter|chap|ch|episode|ep)[-_]?\d/i.test(last) && segments.length > 1) {
      return segments[segments.length - 2] ?? null;
    }
    return last || null;
  } catch {
    return null;
  }
}

/**
 * Reject chapter numbers that are wildly isolated from the rest of what was
 * found on the page — a legitimate chapter list is a roughly dense run of
 * numbers (1, 2, 3, ... N); a single stray link from an unrelated series in
 * a sidebar/"Trending" widget shows up as one lone outlier far above
 * everything else (this is literally what produced "Chapter 711" on a
 * 7-chapter title). This doesn't depend on guessing the site's URL
 * conventions at all, unlike slug-scoping, so it's kept as a second,
 * independent layer of defense — slug-scoping can fail silently if a site's
 * chapter-link format doesn't match the assumed pattern; this can't.
 */
function dropIsolatedOutliers(numbers: number[]): number[] {
  if (numbers.length <= 2) return numbers; // not enough signal to call anything an outlier
  const sorted = [...numbers].sort((a, b) => a - b);
  let result = sorted;

  // Repeatedly check whether the current max is isolated (more than 3x the
  // next-highest remaining value) and drop it if so. Stops as soon as the
  // max is well-supported by nearby values, or only one value is left.
  while (result.length > 2) {
    const max = result[result.length - 1]!;
    const secondMax = result[result.length - 2]!;
    if (secondMax > 0 && max > secondMax * 3) {
      result = result.slice(0, -1);
    } else {
      break;
    }
  }
  return result;
}

// Matches a standalone stat label like "7 Chapters", "172 Chapters", "1.5K+
// Chapters" when the number and word are IN THE SAME text node — the number
// comes BEFORE the word, the opposite order from CHAPTER_REGEX ("Chapter
// 172"). Kept as a fallback for sites that render the stat as one string.
const DECLARED_COUNT_COMBINED_REGEX = /^(\d+(?:\.\d+)?)\s*K?\+?\s*chapters?$/i;

// A label element containing only the word itself — "Chapters", "Chapter".
const CHAPTERS_LABEL_REGEX = /^chapters?$/i;

// A value element containing only a bare number — "7", "1.5K", "172+".
const BARE_NUMBER_REGEX = /^(\d+(?:\.\d+)?)\s*(K)?\+?$/i;

function parseStatNumber(raw: string): number | null {
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*(K)?\+?$/i);
  if (!match || !match[1]) return null;
  const num = parseFloat(match[1]);
  if (Number.isNaN(num)) return null;
  return match[2] ? num * 1000 : num;
}

/**
 * Look for the site's own declared chapter count — most reader-site templates
 * show a stat like "7 Chapters" next to the series' rating/views/bookmarks,
 * separate from any individual chapter link. When present, this is a far more
 * trustworthy signal than anything inferred from scraped links, because it's
 * a number the site itself asserts as *this* series' total — it can't be
 * confused with another series' chapter numbers the way link-scraping can.
 *
 * Handles two real-world renderings, checked in this order:
 *   1. Split stat widget — the number and the "Chapters" label are separate
 *      sibling leaf elements (e.g. a big `<span>7</span>` stacked above a
 *      small `<span>Chapters</span>`). This is the more common pattern in
 *      practice (it's how Asura Scans itself renders it, confirmed against
 *      the live page) — a single combined text node is the exception, not
 *      the rule, so this is checked first rather than as an afterthought.
 *   2. Combined text node — "7 Chapters" as one string. Fallback for sites
 *      that do render it this way.
 *
 * Scoped to the first match in document order. Reader-site layouts
 * consistently place this stat in the series header/info block near the top
 * of the page, while sidebar "Trending"/"Recommended Series" widgets (which
 * may render their own "172 Chapters"-style stat for *other* titles) sit
 * further down — so taking the first match avoids picking up one of those
 * instead of the real one. Returns null if no such label is found, since
 * plenty of sites simply don't show this stat at all.
 */
export function extractDeclaredChapterCount(html: string): number | null {
  const $ = cheerio.load(html);

  // Collect every leaf element (no element children) in document order,
  // since the split-widget check needs to look at *adjacent* leaves.
  const leaves: { el: ReturnType<typeof $>; text: string }[] = [];
  $("*").each((_, el) => {
    const $el = $(el);
    if ($el.children().length > 0) return;
    leaves.push({ el: $el, text: $el.text().trim() });
  });

  // 1. Split widget: a "Chapters" label leaf with a bare-number match found
  // by climbing up through ancestors and checking each level's preceding
  // sibling — covers true siblings (<span>7</span><span>Chapters</span>) and
  // the deeper-nested case where each stat is its own wrapped subtree
  // (<div><span>7</span></div><div><span>Chapters</span></div>), which is
  // the more common real-world pattern (confirmed against the live Asura
  // Scans page, where the number and "Chapters" label render as separate
  // stacked elements rather than one combined string).
  const MAX_CLIMB = 4;
  for (const { el, text } of leaves) {
    if (!CHAPTERS_LABEL_REGEX.test(text)) continue;

    let node = el;
    for (let depth = 0; depth < MAX_CLIMB; depth++) {
      const prev = node.prev();
      if (prev.length) {
        const prevText = prev.text().trim();
        const num = parseStatNumber(prevText);
        if (num !== null) return num;
        break; // found a preceding sibling but it wasn't a bare number —
        // don't keep climbing past it, it's not this kind of widget
      }
      const parent = node.parent();
      if (!parent.length) break;
      node = parent;
    }
  }

  // 2. Combined text node fallback.
  for (const { text } of leaves) {
    const num = parseStatNumber(text);
    if (num !== null) return num;
  }

  return null;
}


/**
 * Best-effort, markup-agnostic scan of every <a> tag on a manhwa page for
 * chapter links. Works across most reader sites since chapter lists are
 * almost always one link per chapter, even when class names differ.
 *
 * Three independent layers of defense against misattributing another series'
 * chapters to this one (sidebar "Latest Release"/"Trending"/"Recommended
 * Series" widgets list chapters from unrelated titles on the same page):
 *   1. Slug-scoping (see deriveSlug) — requires the series' own slug to
 *      appear in a candidate link's href. Falls back to an unscoped scan if
 *      nothing matches, since a site's chapter-link format not matching the
 *      guessed convention is a real possibility, not just a hypothetical.
 *   2. Outlier-trimming (see dropIsolatedOutliers) — regardless of which
 *      scan path ran, discard any chapter number that's isolated far above
 *      the rest of what was found. This is what actually catches the "Ch.
 *      711" case when slug-scoping fails open into the unscoped fallback,
 *      since it doesn't depend on any assumption about URL structure.
 *   3. Declared-count capping (see extractDeclaredChapterCount) — when the
 *      page states its own chapter total (e.g. "7 Chapters"), drop anything
 *      found above that number. This is what catches the case where layer 2
 *      fails open: a page's "Recommended Series" cards can list several
 *      *other* titles' chapter counts close enough together (e.g. 18, 99,
 *      111, 115, 116, 172) that none of them looks isolated to
 *      dropIsolatedOutliers, even though every one of them is bogus for
 *      *this* series. The declared count doesn't depend on the shape of the
 *      other numbers on the page at all, so it catches what outlier-trimming
 *      structurally cannot.
 */
export interface ChapterExtractDebugInfo {
  slug: string | null;
  usedSlugScopedScan: boolean;
  rawFoundNums: number[]; // every chapter number found by the <a>-tag scan, before any filtering
  afterOutlierTrim: number[];
  declaredCount: number | null;
  finalNums: number[];
  found: Map<number, ChapterInfo>;
}

function scanAndFilterChapters(html: string, baseUrl: string): ChapterExtractDebugInfo {
  const $ = cheerio.load(html);
  const slug = deriveSlug(baseUrl);

  const scan = (requireSlugMatch: boolean): Map<number, ChapterInfo> => {
    const found = new Map<number, ChapterInfo>();
    $("a").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const html = $(el).html() || "";
      const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || $(el).text().trim();
      const match = `${text} ${href}`.match(CHAPTER_REGEX);
      if (!match || !match[1]) return;
      const num = parseFloat(match[1]);
      if (Number.isNaN(num)) return;
      let resolvedUrl = href;
      try {
        resolvedUrl = href ? new URL(href, baseUrl).toString() : baseUrl;
      } catch {
        // ignore malformed hrefs
      }
      if (requireSlugMatch && slug) {
        const haystack = `${resolvedUrl} ${href}`.toLowerCase();
        if (!haystack.includes(slug.toLowerCase())) return;
      }
      if (!found.has(num)) {
        found.set(num, { chapterNum: num, title: text || `Chapter ${num}`, url: resolvedUrl, publishedAt: null });
      }
    });
    return found;
  };

  let found = slug ? scan(true) : new Map<number, ChapterInfo>();
  const usedSlugScopedScan = found.size > 0;
  if (found.size === 0) {
    found = scan(false);
  }

  const rawFoundNums = [...found.keys()].sort((a, b) => a - b);
  const afterOutlierTrim = dropIsolatedOutliers(rawFoundNums);
  const declaredCount = extractDeclaredChapterCount(html);
  
  let finalNums = afterOutlierTrim;
  if (declaredCount !== null) {
    const capped = afterOutlierTrim.filter((n) => n <= declaredCount);
    if (capped.length > 0) finalNums = capped;
  }

  return { slug, usedSlugScopedScan, rawFoundNums, afterOutlierTrim, declaredCount, finalNums, found };
}

/**
 * Same extraction as extractChaptersFromHtml, but returns every intermediate
 * stage instead of just the final result — for diagnosing exactly where a
 * given chapter number disappears (never scanned at all vs. dropped by
 * outlier-trimming vs. dropped by declared-count capping) without guessing.
 */
export function debugExtractChapters(html: string, baseUrl: string): ChapterExtractDebugInfo {
  return scanAndFilterChapters(html, baseUrl);
}

export function extractChaptersFromHtml(html: string, baseUrl: string): ChapterInfo[] {
  const { finalNums, found } = scanAndFilterChapters(html, baseUrl);
  const finalSet = new Set(finalNums);
  
  const result = Array.from(found.values()).filter((c) => finalSet.has(c.chapterNum));
  return result.sort((a, b) => b.chapterNum - a.chapterNum);
}

/** Extract a clean manhwa title from OpenGraph tags, falling back to <h1>/<title>. */
export function detectTitleFromHtml(html: string): string | null {
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content") ||
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    null;

  if (!title) return null;

  return title.replace(SITE_SUFFIX_REGEX, "").trim();
}
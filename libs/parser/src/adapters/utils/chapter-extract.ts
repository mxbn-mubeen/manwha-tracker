import * as cheerio from "cheerio";
import type { ChapterInfo } from "@manhwa-tracker/shared";
import { CHAPTER_REGEX, extractChapterNumber } from "./extract-chapter-number";
import { deriveSlug } from "./derive-slug";
import { dropIsolatedOutliers } from "./drop-outliers";
import { extractDeclaredChapterCount } from "./extract-declared-count";
import { detectTitleFromHtml } from "./detect-title";

export { extractChapterNumber, detectTitleFromHtml };

export interface ChapterExtractDebugInfo {
  slug: string | null;
  usedSlugScopedScan: boolean;
  rawFoundNums: number[]; // every chapter number found by the <a>-tag scan, before any filtering
  afterOutlierTrim: number[];
  declaredCount: number | null;
  finalNums: number[];
  found: Map<number, ChapterInfo>;
}

/**
 * Sites like AsuraScans sell "early access" — a chapter is posted and visible
 * in the list well before it's actually free to read, shown with a badge like
 * "EARLY ACCESS" / "Unlocks in 2h 10m" / a lock icon. Treating that chapter as
 * "latest" the instant it appears would tell you to go read something you
 * can't actually open yet. Deliberately not trying to calculate an exact
 * unlock timestamp from relative text like "2h 10m" — that drifts depending
 * on when the scrape happens and is fragile to parse reliably. Simpler and
 * more robust: skip it while the badge is present; the site removes the badge
 * on its own once the timer expires, and the next scheduled sync picks it up
 * as newly available then — same effect, without guessing at a timestamp.
 */
const LOCKED_CHAPTER_INDICATOR = /early access|premium|unlocks? in|\bpaid\b|\blocked\b/i;

function scanAndFilterChapters(html: string, baseUrl: string): ChapterExtractDebugInfo {
  const $ = cheerio.load(html);
  const slug = deriveSlug(baseUrl);

  const scan = (requireSlugMatch: boolean): Map<number, ChapterInfo> => {
    const found = new Map<number, ChapterInfo>();
    $("a").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const htmlContent = $(el).html() || "";
      const text = htmlContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || $(el).text().trim();
      if (LOCKED_CHAPTER_INDICATOR.test(text)) return; // still paywalled — don't count it yet
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
import * as cheerio from "cheerio";
import type { ChapterInfo } from "@manhwa-tracker/shared";
import { CHAPTER_REGEX, extractChapterNumber } from "./extract-chapter-number";
import { deriveSlug } from "./derive-slug";
import { dropIsolatedOutliers } from "./drop-outliers";
import { extractDeclaredChapterCount } from "./extract-declared-count";
import { detectTitleFromHtml } from "./detect-title";

export { extractChapterNumber, detectTitleFromHtml };

/**
 * Parse a relative time string like "1 hour ago", "6 days ago", "2 minutes ago"
 * into an absolute Date. Returns null if unrecognised.
 */
export function parseRelativeTime(text: string): Date | null {
  const now = Date.now();
  const t = text.toLowerCase().trim();
  const m = t.match(/(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (!m) return null;
  const n = parseInt(m[1] || "", 10);
  const unit = m[2];
  const ms: Record<string, number> = {
    second: 1000,
    minute: 60_000,
    hour: 3_600_000,
    day: 86_400_000,
    week: 7 * 86_400_000,
    month: 30 * 86_400_000,
    year: 365 * 86_400_000,
  };
  return new Date(now - n * (ms[unit || ""] ?? 0));
}

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
 * "EARLY ACCESS" / "Unlocks in 2h 10m" / a lock icon.
 * To prevent false "new chapter!" notifications for chapters that the user
 * can't actually read yet, we skip chapters whose title/badge explicitly
 * marks them as paywalled. We intentionally don't try to extract the exact
 * unlock timestamp from relative text like "2h 10m" — that drifts depending
 * on when the scrape happens and is fragile to parse reliably. Simpler and
 * more robust: skip it while the badge is present; the site removes the badge
 * on its own once the timer expires, and the next scheduled sync picks it up
 * as newly available then — same effect, without guessing at a timestamp.
 */
const LOCKED_CHAPTER_INDICATOR = /early access|premium|unlocks? in|\bpaid\b|\blocked\b|coin|🪙|login to read/i;

function scanAndFilterChapters(html: string, baseUrl: string): ChapterExtractDebugInfo {
  const $ = cheerio.load(html);
  const slug = deriveSlug(baseUrl);

  const scan = (requireSlugMatch: boolean): Map<number, ChapterInfo> => {
    const found = new Map<number, ChapterInfo>();
    $("a").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      // Skip coin-locked chapters (Thunderscans): they have no href and use
      // data-coin + data-bs-target="#lockedChapterModal" as modal triggers.
      if (!href || $(el).attr("data-coin")) return;
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
      // Try to parse a relative publish time from the element text
      // e.g. AsuraScans embeds "1 hour ago", "6 days ago" inside the <a> tag
      const publishedAt = parseRelativeTime(text);
      if (!found.has(num)) {
        found.set(num, { chapterNum: num, title: text || `Chapter ${num}`, url: resolvedUrl, publishedAt });
      }
    });
    return found;
  };

  let found = slug ? scan(true) : new Map<number, ChapterInfo>();
  const usedSlugScopedScan = found.size > 0;
  if (found.size === 0) {
    found = scan(false);
  }

  /**
   * DOM-order cap: manga/manhwa sites list chapters newest-first in the chapter
   * list, so the FIRST slug-matching <a> found in document order is the chapter
   * the site itself considers the current latest. Any chapter link with a number
   * STRICTLY GREATER than this is from an old renaming/renumbering — the series
   * restarted at Ch.1 while the old ch.35–89 links are still on the page.
   *
   * Guard condition: only apply the cap when found chapters extend more than
   * 1.5× beyond the DOM-first chapter. This avoids false positives on dense
   * fractional chapter sets (Ch. 0.5, 1, 1.5 ... 34 → still sequential) but
   * correctly fires when old chapters like Ch.70, 71, 89 spike far above the
   * advertised latest (Ch.34).
   */
  const domOrderValues = Array.from(found.values()); // Map preserves insertion = DOM order
  const domLatestNum = domOrderValues[0]?.chapterNum ?? null;
  if (domLatestNum !== null && domLatestNum > 0) {
    const maxFound = Math.max(...found.keys());
    if (maxFound > domLatestNum * 1.5) {
      // Clear stale high-numbered artifacts
      for (const [num] of found) {
        if (num > domLatestNum) found.delete(num);
      }
    }
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
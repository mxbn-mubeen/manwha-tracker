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

function scanAndFilterChapters(html: string, baseUrl: string): ChapterExtractDebugInfo {
  const $ = cheerio.load(html);
  const slug = deriveSlug(baseUrl);

  const scan = (requireSlugMatch: boolean): Map<number, ChapterInfo> => {
    const found = new Map<number, ChapterInfo>();
    $("a").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const htmlContent = $(el).html() || "";
      const text = htmlContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || $(el).text().trim();
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
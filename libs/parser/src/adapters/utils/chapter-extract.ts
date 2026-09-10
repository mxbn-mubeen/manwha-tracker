import * as cheerio from "cheerio";
import type { ChapterInfo, ChapterExtractDebugInfo } from "@manhwa-tracker/shared";
import { CHAPTER_REGEX, extractChapterNumber } from "./extract-chapter-number";
import { deriveSlug } from "./derive-slug";
import { dropIsolatedOutliers } from "./drop-outliers";
import { extractDeclaredChapterCount } from "./extract-declared-count";
import { detectTitleFromHtml } from "./detect-title";

export { extractChapterNumber, detectTitleFromHtml };
// Re-exported for anything importing this type from libs/parser directly —
// canonical definition now lives in libs/shared alongside ChapterInfo, so
// libs/shared can reference it in WebsiteAdapter.debugChapterList without
// creating a shared → parser → shared cycle.
export type { ChapterExtractDebugInfo };

const TIME_UNIT_MS: Record<string, number> = {
  second: 1_000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
  year: 365 * 86_400_000,
};

/**
 * Parse a publish-date string embedded in a chapter link's text content into
 * an absolute Date. Handles every format observed across the current adapters:
 *
 *  • Absolute date   — "July 15, 2026" / "Aug 8, 2026"   (Arenascans)
 *  • Named alias     — "yesterday", "last week"            (AsuraScans, generic)
 *  • "N unit ago"    — "5 days ago", "2 weeks ago"         (AsuraScans)
 *  • Compound        — "1 week, 4 days" / "2 months 1 week" (Mgeko, MGRead)
 *
 * Safe against false positives from chapter numbers ("Chapter 190", "215-eng-li")
 * because bare numbers with no time-unit word after them are never matched.
 *
 * Returns null if the text contains no recognisable date — the caller falls back
 * to discoveredAt in that case, which is intentional.
 */
export function parseRelativeTime(text: string): Date | null {
  const now = Date.now();
  const t = text.toLowerCase().trim();

  // ── Named aliases ────────────────────────────────────────────────────────
  if (t.includes('just now') || t.includes('moments ago')) return new Date(now);
  if (t.includes('yesterday')) return new Date(now - 86_400_000);
  if (t.includes('last week')) return new Date(now - 7 * 86_400_000);
  if (t.includes('last month')) return new Date(now - 30 * 86_400_000);

  // ── Absolute dates: "July 15, 2026" / "Aug 8, 2026" ────────────────────
  // Match the month name anywhere in the text so we pick it up even when
  // the chapter title appears in the same text node.
  const absMatch = text.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (absMatch) {
    const d = new Date(`${absMatch[1]} ${absMatch[2]}, ${absMatch[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  // ── Relative times: "N unit [ago]" and compound "N unit, N unit" ────────
  // Scan for ALL (number + time-unit) pairs and sum their milliseconds.
  // This handles both "5 days ago" (single pair) and "1 week, 4 days" (two
  // pairs) with the same code path — no special-casing needed.
  // Chapter numbers like "190" or "215-eng-li" are never matched because
  // they have no time-unit word following them.
  const relRegex = /(\d+)\s*(second|minute|hour|day|week|month|year)s?/gi;
  let totalMs = 0;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = relRegex.exec(t)) !== null) {
    const n = parseInt(m[1] ?? "0", 10);
    const unit = (m[2] ?? "").toLowerCase();
    totalMs += n * (TIME_UNIT_MS[unit] ?? 0);
    matched = true;
  }
  if (matched) return new Date(now - totalMs);

  return null;
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

export interface ExtractChaptersOptions {
  /**
   * Override for "what chapter number does this site itself consider the
   * current latest" — the one step in this pipeline that's inherently
   * site-specific, not genuinely shareable. Every other stage here (link
   * scanning, paywall detection, outlier trimming) behaves the same across
   * every site's markup; this one varies by template (button order, whether
   * a declared-count stat even exists, how it's formatted) and has been the
   * source of every extraction bug so far — a fix for one site's template
   * quirk kept getting bolted onto this shared function as another special
   * case, each one risking a regression on some other site that depended on
   * the old behavior.
   *
   * Supply this from an adapter's own chapterList() when the generic
   * fallback (declared-count stat, then DOM-order-of-first-few-links) gets
   * fooled by that site's specific template — the fix then lives entirely in
   * that one adapter file and can't affect any other site.
   *
   * Return the chapter number the site considers "latest," or null to fall
   * through to the generic heuristic.
   */
  resolveLatestReference?: (found: Map<number, ChapterInfo>, html: string) => number | null;
  /**
   * Site-specific strategy: determine if a chapter link represents a
   * locked/paywalled chapter that should be skipped.
   * If omitted, falls back to the generic LOCKED_CHAPTER_INDICATOR heuristic.
   */
  isChapterLocked?: (outerHtml: string, text: string) => boolean;
}

function scanAndFilterChapters(html: string, baseUrl: string, options?: ExtractChaptersOptions): ChapterExtractDebugInfo {
  const $ = cheerio.load(html);
  const slug = deriveSlug(baseUrl);

  const scan = (requireSlugMatch: boolean): Map<number, ChapterInfo> => {
    const found = new Map<number, ChapterInfo>();
    $("a").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const outerHtml = $.html(el);
      const htmlContent = $(el).html() || "";
      const text = htmlContent.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || $(el).text().trim();
      
      const isLocked = options?.isChapterLocked 
        ? options.isChapterLocked(outerHtml, text)
        : (LOCKED_CHAPTER_INDICATOR.test(text) || (!href && !!$(el).attr("data-coin"))); // Keep fallback for existing generic sites
        
      if (isLocked) return;
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

  // Computed BEFORE the DOM-order heuristic below runs — see that block's
  // comment for why order matters here.
  const declaredCount = extractDeclaredChapterCount(html);

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
   *
   * Only applied when there's no declared chapter count to trust instead —
   * a site's own "150 Chapters" stat is a direct, non-positional signal, while
   * this heuristic is guessing from link order and can be fooled by a stray
   * "Read Chapter 1" call-to-action button rendered before the real chapter
   * list (confirmed on mgeko.cc: that single low-numbered button was enough
   * to make this heuristic delete the site's entire real 150-chapter list
   * down to just chapter 1). Since this step mutates `found` directly and
   * irreversibly, running it when a declared count is available would delete
   * real chapters before declaredCount ever got a chance to save them —
   * so when we have that stronger signal, skip this step and let the
   * declaredCount-based filtering further down handle capping instead.
   *
   * Also skipped entirely when the adapter supplies its own
   * `resolveLatestReference` — that's a stronger, site-specific signal than
   * either of the generic fallbacks below and takes priority over both.
   */
  let referenceNum: number | null = null;
  if (options?.resolveLatestReference) {
    referenceNum = options.resolveLatestReference(found, html);
  } else if (declaredCount === null) {
    const domOrderValues = Array.from(found.values()); // Map preserves insertion = DOM order
    // Look at the first 5 links and take the max to bypass "Read First Chapter" buttons at the top
    const firstFew = domOrderValues.slice(0, 5).map(c => c.chapterNum);
    referenceNum = firstFew.length > 0 ? Math.max(...firstFew) : null;
  }
  if (referenceNum !== null && referenceNum > 0) {
    const maxFound = Math.max(...found.keys());
    if (maxFound > referenceNum * 1.5) {
      // Clear stale high-numbered artifacts
      for (const [num] of found) {
        if (num > referenceNum) found.delete(num);
      }
    }
  }

  const rawFoundNums = [...found.keys()].sort((a, b) => a - b);
  const afterOutlierTrim = dropIsolatedOutliers(rawFoundNums);

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
export function debugExtractChapters(html: string, baseUrl: string, options?: ExtractChaptersOptions): ChapterExtractDebugInfo {
  return scanAndFilterChapters(html, baseUrl, options);
}

export function extractChaptersFromHtml(html: string, baseUrl: string, options?: ExtractChaptersOptions): ChapterInfo[] {
  const { finalNums, found } = scanAndFilterChapters(html, baseUrl, options);
  const finalSet = new Set(finalNums);
  
  const result = Array.from(found.values()).filter((c) => finalSet.has(c.chapterNum));
  return result.sort((a, b) => b.chapterNum - a.chapterNum);
}
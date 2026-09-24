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
import { parseRelativeTime } from "./parse-relative-time";



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
  /**
   * What HTML/text `isChapterLocked` gets to look at for each chapter link.
   * - 'anchor' (default): only the <a> element itself.
   * - 'row': the <a> plus its nearest wrapper that still contains just this one
   *   chapter link, so a lock badge / icon / "Early Access" pill rendered NEXT TO
   *   the link (a sibling, not a child) is seen too. Opt-in per adapter so sites
   *   that already work are not affected.
   */
  lockScope?: 'anchor' | 'row';
}

const MAX_ROW_CLIMB = 3;

/**
 * Climb from a chapter link to the smallest wrapper that represents that chapter's
 * row: keep going up while the parent still contains at most ONE chapter-looking
 * link (this one), stopping before it would swallow neighbouring chapters.
 */
function getChapterRow($: cheerio.CheerioAPI, anchor: cheerio.Cheerio<any>): cheerio.Cheerio<any> {
  let row = anchor;
  for (let i = 0; i < MAX_ROW_CLIMB; i++) {
    const parent = row.parent();
    if (!parent.length || parent.is("body, html")) break;
    let chapterLinks = 0;
    parent.find("a").each((_, a) => {
      const $a = $(a);
      if (CHAPTER_REGEX.test(`${$a.text()} ${$a.attr("href") ?? ""}`)) chapterLinks++;
      if (chapterLinks > 1) return false; // early exit — already too broad
      return undefined;
    });
    if (chapterLinks > 1) break;
    row = parent;
  }
  return row;
}

export interface ChapterAnchorDiagnostic {
  chapterNum: number;
  text: string;
  lockedByAnchor: boolean;
  lockedByRow: boolean;
  anchorHtml: string;
  rowHtml: string;
}

/**
 * Diagnostic helper: for the first `limit` chapter links on a page, report whether
 * the lock check fires on the <a> alone vs on its surrounding row, together with
 * the raw markup — so a site's real lock markup can be inspected instead of guessed.
 */
export function describeChapterAnchors(
  html: string,
  baseUrl: string,
  isChapterLocked: (outerHtml: string, text: string) => boolean,
  limit = 10,
): ChapterAnchorDiagnostic[] {
  const $ = cheerio.load(html);
  const slug = deriveSlug(baseUrl)?.toLowerCase() ?? null;
  const strip = (h: string) => h.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const out: ChapterAnchorDiagnostic[] = [];
  $("a").each((_, el) => {
    if (out.length >= limit) return false;
    const $el = $(el);
    const href = $el.attr("href") ?? "";
    const text = strip($el.html() || "") || $el.text().trim();
    const match = `${text} ${href}`.match(CHAPTER_REGEX);
    if (!match || !match[1]) return undefined;
    if (slug && !href.toLowerCase().includes(slug)) return undefined;
    const row = getChapterRow($, $el);
    const anchorHtml = $.html(el);
    const rowHtml = $.html(row);
    out.push({
      chapterNum: parseFloat(match[1]),
      text,
      lockedByAnchor: isChapterLocked(anchorHtml, text),
      lockedByRow: isChapterLocked(rowHtml, strip(row.html() || "")),
      anchorHtml: anchorHtml.slice(0, 500),
      rowHtml: rowHtml.slice(0, 900),
    });
    return undefined;
  });
  return out;
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
      
      let lockHtml = outerHtml;
      let lockText = text;
      if (options?.lockScope === "row" && CHAPTER_REGEX.test(`${text} ${href}`)) {
        const row = getChapterRow($, $(el));
        lockHtml = $.html(row);
        lockText = (row.html() || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      }

      const isLocked = options?.isChapterLocked
        ? options.isChapterLocked(lockHtml, lockText)
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
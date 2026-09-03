import * as cheerio from "cheerio";

// Matches a standalone stat label like "7 Chapters", "172 Chapters", "1.5K+
// Chapters" when the number and word are IN THE SAME text node — the number
// comes BEFORE the word, the opposite order from CHAPTER_REGEX ("Chapter
// 172"). Kept as a fallback for sites that render the stat as one string.
const DECLARED_COUNT_COMBINED_REGEX = /^(\d+(?:\.\d+)?)\s*K?\+?\s*chapters?$/i;

// A label element containing only the word itself — "Chapters", "Chapter".
const CHAPTERS_LABEL_REGEX = /^chapters?$/i;

// A value element that STARTS with a number — "7", "1.5K", "172+", or a site
// oddity like mgeko's "150-eng-li" (chapter count glued to a language tag
// with no separating space). Intentionally not anchored at the end: we only
// trust the leading number, since anything trailing it isn't part of the count.
const BARE_NUMBER_REGEX = /^(\d+(?:\.\d+)?)\s*(K)?\+?/i;

function parseStatNumber(raw: string): number | null {
  const match = raw.match(BARE_NUMBER_REGEX);
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
    const match = text.match(DECLARED_COUNT_COMBINED_REGEX);
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      if (!Number.isNaN(num)) return match[0].toUpperCase().includes('K') ? num * 1000 : num;
    }
  }

  return null;
}

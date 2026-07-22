/**
 * Derive a series slug from its page URL to scope chapter extraction —
 * e.g. "https://asurascans.com/series/my-slain-dragon-bride/" -> "my-slain-dragon-bride".
 * Reader sites almost universally embed the series slug in both the series
 * page URL and every one of its own chapter URLs, so requiring the slug to
 * appear in a candidate link's href is a strong, markup-agnostic way to
 * reject links that belong to a *different* series entirely.
 */
export function deriveSlug(baseUrl: string): string | null {
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

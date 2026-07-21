/**
 * Cover-art lookup, independent of any reading-source adapter.
 *
 * Uses MangaDex's public REST API (https://api.mangadex.org — documented,
 * free, no API key) purely as a cover-image index. This works even for
 * manhwa whose only tracked source is Telegram, where there's no website
 * to scrape an og:image from.
 *
 * NOT wired to any reading/chapter functionality — MangaDex is not one of
 * the 4 site adapters this project scrapes for chapters (see adapters/factory.ts).
 * This is cover art only.
 */

const MANGADEX_API = 'https://api.mangadex.org';

interface MangaDexSearchResponse {
  data: Array<{
    id: string;
    relationships: Array<{ type: string; attributes?: { fileName?: string } }>;
  }>;
}

/**
 * Look up a cover image URL for a title via MangaDex search.
 * Returns null (never throws) if nothing is found or the request fails —
 * this is a best-effort enrichment step, not a required one.
 */
export async function lookupCoverUrl(title: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      title,
      limit: '1',
      'order[relevance]': 'desc',
    });
    params.append('includes[]', 'cover_art');

    const res = await fetch(`${MANGADEX_API}/manga?${params.toString()}`, {
      headers: { 'User-Agent': 'manhwa-tracker (personal use)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as MangaDexSearchResponse;
    const manga = json.data?.[0];
    if (!manga) return null;

    const coverRel = manga.relationships.find((r) => r.type === 'cover_art');
    const fileName = coverRel?.attributes?.fileName;
    if (!fileName) return null;

    return `https://uploads.mangadex.org/covers/${manga.id}/${fileName}`;
  } catch {
    return null;
  }
}

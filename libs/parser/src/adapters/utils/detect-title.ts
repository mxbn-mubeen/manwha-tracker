import * as cheerio from "cheerio";

const SITE_SUFFIX_REGEX =
  /\s*[-|]\s*(Asura ?Scans?|Webtoons?|Reaper ?Scans?|Manhuaus?|Read (Online|Free)).*$/i;

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

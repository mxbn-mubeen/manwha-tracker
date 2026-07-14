import * as cheerio from "cheerio";
import { slugify } from "@manhwa-tracker/utils";

export interface ManhwaMetadata {
  title: string;
  slug: string;
  coverUrl?: string;
  description?: string;
  sourceUrl: string;
}

/**
 * Generic parser that attempts to extract standard OpenGraph tags from a URL.
 */
export async function parseMetadataFromUrl(url: string): Promise<ManhwaMetadata> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Fallback cascade for Title
  const title = 
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text() ||
    "Unknown Title";

  // Fallback cascade for Cover Image
  const coverUrl = 
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    undefined;

  // Fallback cascade for Description
  const description = 
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    undefined;

  // Generate a clean slug from the title
  const cleanTitle = title.replace(/ Read Online Free/gi, "").trim();
  const slug = slugify(cleanTitle);

  return {
    title: cleanTitle,
    slug,
    coverUrl,
    description,
    sourceUrl: url,
  };
}

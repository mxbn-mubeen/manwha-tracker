export const CHAPTER_REGEX = /\b(?:chapter|chap\.?|ch\.?|episode|ep\.?)[\s#-]*(\d+(?:\.\d+)?)/i;

/**
 * Extract a single chapter number from free text — a message caption,
 * a document filename, a link title, etc. Returns null if nothing matches.
 * Shared by website adapters and the Telegram download-watcher so chapter
 * parsing logic lives in exactly one place.
 */
export function extractChapterNumber(text: string): number | null {
  const match = text.match(CHAPTER_REGEX);
  if (!match || !match[1]) return null;
  const num = parseFloat(match[1]);
  return Number.isNaN(num) ? null : num;
}
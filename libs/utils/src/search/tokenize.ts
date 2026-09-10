import { normalize } from './normalize';

/**
 * Stop-words that carry no discriminating signal on their own.
 * Single-letter tokens are kept (e.g. "s" in "S-Classes").
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for',
  'by', 'with', 'as', 'is', 'it', 'be', 'was', 'are', 'were',
  'that', 'this', 'those', 'these', 'from', 'after', 'before',
]);

/**
 * Tokenize a (already-normalized or raw) string into meaningful tokens.
 *
 * - Normalizes the input first (safe to call on already-normalized strings).
 * - Splits on spaces.
 * - Drops stop-words (but keeps single-letter tokens, e.g. "s").
 * - Drops empty strings.
 *
 * Examples:
 *   "the s classes that i raised" → ["s", "classes", "raised"]
 *   "solo leveling"               → ["solo", "leveling"]
 *   "beginning after end"         → ["beginning", "end"]
 */
export function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t.length > 0 && (t.length === 1 || !STOP_WORDS.has(t)));
}

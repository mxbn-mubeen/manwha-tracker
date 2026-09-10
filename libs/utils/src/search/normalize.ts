/**
 * Normalize a string for search comparison.
 *
 * Transformations applied (in order):
 *   1. Unicode NFD decomposition → strip combining diacritics (accents)
 *   2. Lowercase
 *   3. Hyphens, underscores, apostrophes → space
 *   4. Any remaining non-alphanumeric character → space
 *   5. Collapse multiple spaces → single space
 *   6. Trim leading/trailing whitespace
 *
 * Examples:
 *   "The S-Classes That I Raised" → "the s classes that i raised"
 *   "Solo Leveling: Ragnarök"     → "solo leveling ragnarok"
 *   "s_classes"                   → "s classes"
 *   "S'Classes"                   → "s classes"
 */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip combining diacritics
    .toLowerCase()
    .replace(/[-_'`]/g, ' ')           // hyphens, underscores, apostrophes → space
    .replace(/[^a-z0-9 ]/g, ' ')       // anything else non-alphanumeric → space
    .replace(/\s+/g, ' ')              // collapse runs of spaces
    .trim();
}

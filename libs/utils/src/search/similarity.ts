/**
 * Conservative fuzzy similarity between two strings.
 *
 * Uses a normalized Levenshtein edit distance to compute a 0..1 similarity
 * score. This is intentionally conservative — we require a high similarity
 * threshold before it contributes to a search score, so "dragon" never
 * accidentally matches "Solo Leveling".
 *
 * A similarity of 1.0 means identical strings.
 * A similarity of 0.0 means completely different.
 *
 * Performance note: We use the standard O(m*n) DP approach, which is
 * perfectly fine for manhwa titles (avg ~30 chars).
 */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const la = a.length;
  const lb = b.length;

  // Early exit: if lengths differ by more than half the longer string,
  // similarity is guaranteed to be too low to be useful.
  if (Math.abs(la - lb) > Math.max(la, lb) / 2) return 0;

  // Standard DP edit distance (only two rows needed).
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  let curr = new Array<number>(lb + 1).fill(0);

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,          // deletion
        (curr[j - 1] ?? 0) + 1,      // insertion
        (prev[j - 1] ?? 0) + cost,   // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  const editDist = prev[lb] ?? Math.max(la, lb);
  return 1 - editDist / Math.max(la, lb);
}

/**
 * Minimum similarity required to consider a fuzzy match meaningful.
 * At 0.75 a 1-char typo in a 4-char word is accepted;
 * completely unrelated strings score well below this.
 */
export const SIMILARITY_THRESHOLD = 0.75;

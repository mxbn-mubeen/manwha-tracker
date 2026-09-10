import { normalize } from './normalize.js';
import { tokenize } from './tokenize.js';
import { similarity, SIMILARITY_THRESHOLD } from './similarity.js';

/**
 * Score priority ladder (0..1):
 *
 * 1.00  Exact normalized match
 * 0.85  Normalized candidate starts with normalized query
 * 0.75  All query tokens are present as substrings in the candidate
 * 0.60  All query tokens start-with match in the candidate tokens
 * 0.45  Fuzzy whole-string match (similarity >= threshold)
 * 0.25  Majority of query tokens present (> half)
 * 0.10  At least one query token present
 * 0.00  No match
 *
 * For numeric fields (e.g. id) the caller passes the string representation
 * ("344"). A different scoring ladder applies:
 *
 * 1.00  Exact match ("344" === "344")
 * 0.80  Candidate starts with query ("34" matches "344")
 * 0.00  Otherwise (no fuzzy for numeric fields — a partial digit match is
 *       meaningless for IDs)
 */
export function scoreField(
  candidateRaw: string,
  queryNorm: string,
  queryTokens: string[],
  isNumeric: boolean,
): number {
  if (!queryNorm || queryTokens.length === 0) return 0;

  if (isNumeric) {
    // Candidate is already the string form of the ID.
    const cand = candidateRaw.trim();
    if (cand === queryNorm) return 1.0;
    if (cand.startsWith(queryNorm) && queryNorm.length >= 2) return 0.8;
    return 0;
  }

  const candNorm = normalize(candidateRaw);
  const candTokens = tokenize(candNorm);

  // 1. Exact
  if (candNorm === queryNorm) return 1.0;

  // 2. Starts-with (by normalized full string)
  if (candNorm.startsWith(queryNorm)) return 0.85;

  // 3. All query tokens present as substrings in the candidate normalized string
  if (queryTokens.every((qt) => candNorm.includes(qt))) return 0.75;

  // 4. All query tokens have a prefix match in at least one candidate token
  //    (token must be ≥ 3 chars to avoid noise from very short prefixes)
  const allTokenPrefixMatch = queryTokens.every((qt) =>
    qt.length >= 2 && candTokens.some((ct) => ct.startsWith(qt))
  );
  if (allTokenPrefixMatch) return 0.60;

  // 5. Fuzzy whole-string match
  const sim = similarity(candNorm, queryNorm);
  if (sim >= SIMILARITY_THRESHOLD) return 0.45 * sim;

  // 6. Per-token fuzzy: try matching each query token against candidate tokens
  const matchedTokens = queryTokens.filter((qt) =>
    candNorm.includes(qt) ||
    candTokens.some((ct) => similarity(ct, qt) >= SIMILARITY_THRESHOLD)
  );
  const ratio = matchedTokens.length / queryTokens.length;
  if (ratio > 0.5) return 0.25 * ratio;
  if (ratio > 0)   return 0.10 * ratio;

  return 0;
}

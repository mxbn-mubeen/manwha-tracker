import { normalize } from './normalize.js';
import { tokenize } from './tokenize.js';
import { scoreField } from './score.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A field that can be searched. Value may be a string, a number, or a
 *  string array (e.g. genres). */
export type SearchableValue = string | number | string[];

export interface SearchField<T> {
  /** The property key on each item to search. */
  key: keyof T;
  /** Relative weight for this field's score (0..1). */
  weight: number;
  /**
   * Set to true when the field value is an array of strings (e.g. genres[]).
   * The engine will score each element and take the maximum.
   */
  isArray?: boolean;
}

export interface SearchOptions<T> {
  /** Fields to search and their weights. */
  fields: SearchField<T>[];
  /**
   * Maximum number of results to return after ranking.
   * Defaults to returning all results above the threshold.
   */
  limit?: number;
  /**
   * Minimum weighted score to include in results (0..1).
   * Defaults to 0.05 — anything truly unrelated scores 0.
   */
  threshold?: number;
}

// ---------------------------------------------------------------------------
// Main search function
// ---------------------------------------------------------------------------

/**
 * Search a list of items using normalized, token-aware, fuzzy matching.
 *
 * Returns items sorted by relevance (highest score first), filtered by
 * threshold, and optionally limited. The original item objects are returned
 * (no score wrappers) so callers can use results directly.
 *
 * @example
 * ```ts
 * const results = search(manhwas, 's class raised', {
 *   fields: [
 *     { key: 'title', weight: 1 },
 *     { key: 'id',    weight: 0.7 },
 *   ],
 *   limit: 8,
 * });
 * ```
 */
export function search<T>(
  items: T[],
  query: string,
  opts: SearchOptions<T>,
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queryNorm   = normalize(trimmed);
  const queryTokens = tokenize(trimmed);
  const threshold   = opts.threshold ?? 0.05;

  // Pre-compute total weight for normalisation.
  const totalWeight = opts.fields.reduce((sum, f) => sum + f.weight, 0);

  const scored: Array<{ item: T; score: number }> = [];

  for (const item of items) {
    let weightedScore = 0;

    for (const field of opts.fields) {
      const raw = item[field.key] as SearchableValue | undefined;
      if (raw == null) continue;

      // Determine if field is numeric (e.g. id).
      const isNumeric = typeof raw === 'number';

      let fieldScore = 0;

      if (isNumeric) {
        // Convert number to string; use numeric scoring path.
        fieldScore = scoreField(String(raw), queryNorm, queryTokens, true);
      } else if (field.isArray && Array.isArray(raw)) {
        // Score each element, take the best.
        for (const element of raw as string[]) {
          const s = scoreField(element, queryNorm, queryTokens, false);
          if (s > fieldScore) fieldScore = s;
        }
      } else if (typeof raw === 'string') {
        fieldScore = scoreField(raw, queryNorm, queryTokens, false);
      }

      weightedScore += fieldScore * field.weight;
    }

    // Normalise by total weight.
    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

    if (finalScore >= threshold) {
      scored.push({ item, score: finalScore });
    }
  }

  // Sort descending by score.
  scored.sort((a, b) => b.score - a.score);

  const results = scored.map((s) => s.item);
  return opts.limit != null ? results.slice(0, opts.limit) : results;
}

/**
 * Pure cadence-decision logic, extracted from sync.processor.ts so it can be
 * unit-tested without mocking a SyncRepository or hitting a real database.
 * This function has no side effects — it doesn't log, doesn't write rows,
 * doesn't touch the database. All of that stays in sync.processor.ts, which
 * calls this and acts on the result.
 */

export interface CadenceDecision {
  /** True when there are fewer than 3 known release dates — too little
   *  history to predict anything, so cadence is never applied. */
  insufficientData: boolean;
  /** True when the release history is too inconsistent to trust a
   *  prediction from (see IRREGULARITY_THRESHOLD below). When true,
   *  shouldSkip is always false — an irregular title is always checked. */
  isIrregular: boolean;
  /** True only when the title is regular, not yet due, and not overdue.
   *  This is the only case where the sync should actually skip scraping. */
  shouldSkip: boolean;
  /** True when the 3x-overdue grace period has been crossed. Only
   *  meaningful when isIrregular/insufficientData are both false — an
   *  irregular or data-poor title is always checked regardless, so
   *  "overdue" doesn't apply to it. Distinct from shouldSkip being false
   *  for the ordinary "due" case (now >= nextExpectedTime but still under
   *  3x) — this flag exists so callers can tell those two apart for
   *  logging/reporting purposes. */
  isOverdue: boolean;
  medianIntervalMs: number;
  madMs: number;
  /** Predicted next release time, in epoch ms. Null when there wasn't
   *  enough data to compute one (insufficientData or isIrregular). */
  nextExpectedTime: number | null;
  /** 3x the median interval past the last release — once past this point,
   *  always scrape regardless of prediction (see the project's cadence
   *  design: prediction is only ever a scraping-frequency optimization,
   *  never allowed to be the reason a real chapter goes undetected). */
  overdueTime: number | null;
}

// MAD (median absolute deviation) as a fraction of the median interval
// itself. 0.5 means "the typical deviation is half the typical gap" — a
// simple, explainable starting threshold, not yet tuned against real
// release-history data.
export const IRREGULARITY_THRESHOLD = 0.5;

function median(sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;
  const mid = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? ((sortedValues[mid - 1] ?? 0) + (sortedValues[mid] ?? 0)) / 2
    : (sortedValues[mid] ?? 0);
}

/**
 * @param recentDates Chapter release dates, ascending (oldest first) — the
 *   same shape SyncRepository.getChapterReleaseDates() already returns.
 * @param now Epoch ms to evaluate against. Defaults to Date.now(), but
 *   accepting it as a parameter is what makes this testable without mocking
 *   the clock.
 */
export function evaluateCadence(recentDates: Date[], now: number = Date.now()): CadenceDecision {
  if (recentDates.length < 3) {
    return {
      insufficientData: true,
      isIrregular: false,
      shouldSkip: false,
      isOverdue: false,
      medianIntervalMs: 0,
      madMs: 0,
      nextExpectedTime: null,
      overdueTime: null,
    };
  }

  // Build gaps array (ms between consecutive releases, oldest-first)
  const gaps: number[] = [];
  for (let i = 1; i < recentDates.length; i++) {
    const d1 = recentDates[i];
    const d0 = recentDates[i - 1];
    if (d1 && d0) {
      gaps.push(d1.getTime() - d0.getTime());
    }
  }

  // True median (not mean) — resistant to a single outlier date
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianIntervalMs = median(sortedGaps);

  // Irregularity check via median absolute deviation — see IRREGULARITY_THRESHOLD's
  // comment. Uses MAD rather than standard deviation for the same reason the
  // interval itself uses a median: one wildly-off gap (a bulk import, a
  // missed cycle) shouldn't make a genuinely regular series look
  // unpredictable.
  const absDeviations = sortedGaps
    .map((g) => Math.abs(g - medianIntervalMs))
    .sort((a, b) => a - b);
  const madMs = median(absDeviations);
  const isIrregular = medianIntervalMs > 0 && madMs / medianIntervalMs > IRREGULARITY_THRESHOLD;

  if (isIrregular) {
    return {
      insufficientData: false,
      isIrregular: true,
      shouldSkip: false,
      isOverdue: false,
      medianIntervalMs,
      madMs,
      nextExpectedTime: null,
      overdueTime: null,
    };
  }

  const lastRelease = recentDates[recentDates.length - 1];
  const lastReleaseTime = lastRelease ? lastRelease.getTime() : now;
  const nextExpectedTime = lastReleaseTime + medianIntervalMs;
  const overdueTime = lastReleaseTime + medianIntervalMs * 3;

  // Skip only when: not yet at the predicted release time, AND not yet 3x
  // overdue (the grace-period override that guarantees a real chapter can
  // never be missed indefinitely just because a prediction was wrong).
  const shouldSkip = now < nextExpectedTime && now < overdueTime;
  const isOverdue = now >= overdueTime;

  return {
    insufficientData: false,
    isIrregular: false,
    shouldSkip,
    isOverdue,
    medianIntervalMs,
    madMs,
    nextExpectedTime,
    overdueTime,
  };
}

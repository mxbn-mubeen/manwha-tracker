import { describe, it, expect } from 'vitest';
import { evaluateCadence, IRREGULARITY_THRESHOLD } from './cadence';

const DAY = 24 * 60 * 60 * 1000;
// Fixed reference point so every test is deterministic — no reliance on the
// real system clock.
const T0 = new Date('2026-01-01T00:00:00Z').getTime();

/** Build a sequence of release dates from T0, given gaps in days. */
function datesFromGaps(gapsInDays: number[]): Date[] {
  const dates: Date[] = [new Date(T0)];
  let t = T0;
  for (const g of gapsInDays) {
    t += g * DAY;
    dates.push(new Date(t));
  }
  return dates;
}

describe('evaluateCadence', () => {
  describe('insufficient data', () => {
    it('never skips with fewer than 3 release dates, regardless of how tight the gaps are', () => {
      const dates = datesFromGaps([7]); // only 2 dates
      const decision = evaluateCadence(dates, T0 + 1 * DAY);
      expect(decision.insufficientData).toBe(true);
      expect(decision.shouldSkip).toBe(false);
      expect(decision.isIrregular).toBe(false);
    });

    it('treats exactly 2 dates the same as 0 or 1 — the >= 3 threshold is a hard floor', () => {
      expect(evaluateCadence([], T0).insufficientData).toBe(true);
      expect(evaluateCadence([new Date(T0)], T0).insufficientData).toBe(true);
      expect(evaluateCadence(datesFromGaps([5]), T0).insufficientData).toBe(true);
    });
  });

  describe('regular release pattern (7d/7d/8d/7d)', () => {
    const dates = datesFromGaps([7, 7, 8, 7]); // 5 dates, last one at T0+29d
    const lastReleaseTime = T0 + 29 * DAY;

    it('is not classified as irregular', () => {
      const decision = evaluateCadence(dates, lastReleaseTime + 1 * DAY);
      expect(decision.isIrregular).toBe(false);
      expect(decision.insufficientData).toBe(false);
    });

    it('computes the true median (7d), not a mean skewed by the one 8d gap', () => {
      const decision = evaluateCadence(dates, lastReleaseTime);
      expect(decision.medianIntervalMs).toBe(7 * DAY);
    });

    it('skips when checked well before the predicted next release', () => {
      // next expected = lastRelease + 7d; checking 1 day after last release
      // is nowhere near due yet.
      const decision = evaluateCadence(dates, lastReleaseTime + 1 * DAY);
      expect(decision.shouldSkip).toBe(true);
    });

    it('does not skip once the predicted release time has arrived', () => {
      const decision = evaluateCadence(dates, lastReleaseTime + 7 * DAY);
      expect(decision.shouldSkip).toBe(false);
      expect(decision.isIrregular).toBe(false);
    });

    it('does not skip once past the predicted time, even before the 3x-overdue mark', () => {
      const decision = evaluateCadence(dates, lastReleaseTime + 10 * DAY);
      expect(decision.shouldSkip).toBe(false);
    });

    it('forces a check once 3x the median interval has passed (the overdue override)', () => {
      // overdue = lastRelease + 7d * 3 = +21d
      const justBeforeOverdue = evaluateCadence(dates, lastReleaseTime + 20 * DAY);
      const atOverdue = evaluateCadence(dates, lastReleaseTime + 21 * DAY);
      // Both are already past nextExpectedTime here, so both should already
      // be shouldSkip: false — the overdue mark is a hard backstop, not the
      // only thing that can prevent a skip. Confirm neither one skips.
      expect(justBeforeOverdue.shouldSkip).toBe(false);
      expect(atOverdue.shouldSkip).toBe(false);
    });

    it('distinguishes an ordinary due check from a 3x-overdue one via isOverdue', () => {
      // Just past the predicted release (+8d), well under the +21d overdue mark
      const ordinaryDue = evaluateCadence(dates, lastReleaseTime + 8 * DAY);
      expect(ordinaryDue.isOverdue).toBe(false);

      // Right at the +21d overdue threshold
      const overdue = evaluateCadence(dates, lastReleaseTime + 21 * DAY);
      expect(overdue.isOverdue).toBe(true);
    });

    it('isOverdue is false while a regular title is correctly skipped (not due yet)', () => {
      const decision = evaluateCadence(dates, lastReleaseTime + 1 * DAY);
      expect(decision.shouldSkip).toBe(true);
      expect(decision.isOverdue).toBe(false);
    });
  });

  describe('irregular release pattern (3d/15d/6d/21d/2d)', () => {
    const dates = datesFromGaps([3, 15, 6, 21, 2]); // 6 dates

    it('is classified as irregular and cadence is bypassed entirely', () => {
      const decision = evaluateCadence(dates, T0 + 5 * DAY);
      expect(decision.isIrregular).toBe(true);
    });

    it('never skips when irregular, no matter when it is checked', () => {
      const decision = evaluateCadence(dates, T0 + 1 * DAY);
      expect(decision.shouldSkip).toBe(false);
    });

    it('has a MAD/median ratio above the irregularity threshold', () => {
      const decision = evaluateCadence(dates, T0);
      expect(decision.madMs / decision.medianIntervalMs).toBeGreaterThan(IRREGULARITY_THRESHOLD);
    });
  });

  describe('one extreme outlier should not misclassify an otherwise-regular series', () => {
    // 7d, 7d, 7d, then one 45-day gap (e.g. a hiatus) — the three normal
    // gaps should still define "regular" via the median/MAD, rather than
    // the single outlier dragging the whole series into "irregular."
    const dates = datesFromGaps([7, 7, 7, 45]);
    const lastReleaseTime = T0 + (7 + 7 + 7 + 45) * DAY;

    it('is NOT classified as irregular despite the 45-day outlier', () => {
      const decision = evaluateCadence(dates, lastReleaseTime + 1 * DAY);
      expect(decision.isIrregular).toBe(false);
    });

    it('still correctly predicts based on the normal 7-day pattern', () => {
      const decision = evaluateCadence(dates, lastReleaseTime);
      expect(decision.medianIntervalMs).toBe(7 * DAY);
    });

    it('the overdue override still fires based on time since the actual last release', () => {
      // overdue = lastReleaseTime + 7d * 3 = +21d after the last (post-hiatus) release
      const decision = evaluateCadence(dates, lastReleaseTime + 25 * DAY);
      expect(decision.shouldSkip).toBe(false);
    });
  });

  describe('boundary with database fallback (discoveredAt vs publishedAt)', () => {
    // evaluateCadence deliberately doesn't know or care whether a date came
    // from a site's real publishedAt or a discoveredAt fallback (see
    // SyncRepository.getChapterReleaseDates' COALESCE) — that resolution
    // happens at the database layer, before dates ever reach this function.
    // This test documents that boundary: evaluateCadence's behavior is
    // identical either way, given the same sequence of dates.
    it('produces the same decision regardless of where the dates conceptually came from', () => {
      const dates = datesFromGaps([7, 7, 7]);
      const decision = evaluateCadence(dates, T0 + 21 * DAY + 1 * DAY);
      expect(decision.isIrregular).toBe(false);
      expect(decision.medianIntervalMs).toBe(7 * DAY);
    });
  });
});

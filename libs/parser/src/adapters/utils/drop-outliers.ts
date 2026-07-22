/**
 * Reject chapter numbers that are wildly isolated from the rest of what was
 * found on the page — a legitimate chapter list is a roughly dense run of
 * numbers (1, 2, 3, ... N); a single stray link from an unrelated series in
 * a sidebar/"Trending" widget shows up as one lone outlier far above
 * everything else (this is literally what produced "Chapter 711" on a
 * 7-chapter title). This doesn't depend on guessing the site's URL
 * conventions at all, unlike slug-scoping, so it's kept as a second,
 * independent layer of defense — slug-scoping can fail silently if a site's
 * chapter-link format doesn't match the assumed pattern; this can't.
 */
export function dropIsolatedOutliers(numbers: number[]): number[] {
  if (numbers.length <= 2) return numbers; // not enough signal to call anything an outlier
  const sorted = [...numbers].sort((a, b) => a - b);
  let result = sorted;

  // Repeatedly check whether the current max is isolated (more than 3x the
  // next-highest remaining value) and drop it if so. Stops as soon as the
  // max is well-supported by nearby values, or only one value is left.
  while (result.length > 2) {
    const max = result[result.length - 1]!;
    const secondMax = result[result.length - 2]!;
    if (secondMax > 0 && max > secondMax * 3) {
      result = result.slice(0, -1);
    } else {
      break;
    }
  }
  return result;
}

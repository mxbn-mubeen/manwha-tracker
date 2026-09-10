export type SourceOutcome = {
  manhwaId: number;
  sourceUrl: string;
  manhwaTitle: string;
  status: 'success' | 'blocked' | 'error';
  chaptersFound: number;
  newChapters: number;
  reason: string | null;
  durationMs: number;
};

/** "https://comix.to/title/..." -> "Comix". Falls back to hostname if parsing fails. */
export function humanizeSourceName(url: string): string {
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    const base = host.replace(/^www\./, '').split('.')[0] || host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return url;
  }
}

/**
 * Per-source sync failures come straight from the site adapter — `result.errors[0]`
 * is shown verbatim in the navbar Sync button's toast (AppShell.tsx), so raw
 * driver text should never end up there.
 */
export function describeSourceError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (err instanceof Error && err.name === 'CloudflareBlockedError') {
    const reason = (err as { reason?: 'not-configured' | 'unsolved' }).reason;
    return reason === 'not-configured'
      ? 'Cloudflare challenge (FlareSolverr not configured)'
      : 'Cloudflare challenge (FlareSolverr could not solve it)';
  }

  if (/timed? ?out|ETIMEDOUT/i.test(message)) return 'Site took too long to respond.';
  if (/ENOTFOUND|ECONNREFUSED|fetch failed/i.test(message)) return 'Could not reach the site.';
  if (/403|forbidden/i.test(message)) return 'Site blocked the request (403).';
  if (/404|not found/i.test(message)) return 'Page no longer exists (404).';
  if (/cannot read propert|undefined is not|null is not/i.test(message)) {
    return "Site layout changed — couldn't find chapters.";
  }
  return 'Failed to check for updates.';
}

/**
 * Formats milliseconds into a human-readable string: "800ms", "1.2s", "1m 5s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}m ${s}s`;
}

/**
 * Renders a header line + tree-formatted body lines, e.g.:
 *   [SYNC] 003/230  Some Manhwa
 *          ├─ ID: 231
 *          ├─ Pattern: ✓ Regular
 *          └─ Status: ⏭ Skipped
 * The last line automatically gets the closing "└─" — callers never hand-track
 * which line is last, which is easy to get wrong across blocks of varying
 * length (skip vs. full-check vs. multi-source blocks all differ in size).
 */
export function renderTreeBlock(header: string, lines: string[]): string {
  const indent = '       '; // aligns under "[SYNC] 003/230  "
  const rendered = lines.map((line, i) => {
    const branch = i === lines.length - 1 ? '└─' : '├─';
    return `${indent}${branch} ${line}`;
  });
  return [header, ...rendered].join('\n');
}

const BANNER_WIDTH = 52;
const BANNER_RULE = '━'.repeat(BANNER_WIDTH);

export function renderSyncStartBanner(sourceCount: number, mode: string, startedAt: Date): string {
  return [
    BANNER_RULE,
    '[SYNC] ▶ START',
    BANNER_RULE,
    `Sources: ${sourceCount}`,
    `Started: ${formatUtc(startedAt)}`,
    `Mode: ${mode}`,
    BANNER_RULE,
  ].join('\n');
}

export interface SyncCompleteSummary {
  durationMs: number;
  manhwaChecked: number;
  sourcesChecked: number;
  newChapters: number;
  noNewChapters: number;
  skippedSchedule: number;
  irregularCount: number;
  errorCount: number;
  blockedCount: number;
  overdueCount: number;
  startedAt: Date;
  finishedAt: Date;
}

export function renderSyncCompleteBanner(s: SyncCompleteSummary): string {
  return [
    BANNER_RULE,
    '[SYNC] ■ COMPLETE',
    BANNER_RULE,
    `Duration: ${formatDuration(s.durationMs)}`,
    '',
    `Manhwa checked:       ${s.manhwaChecked}`,
    `Sources checked:      ${s.sourcesChecked}`,
    '',
    `New chapters:         ${s.newChapters}`,
    `No new chapters:      ${s.noNewChapters}`,
    `Cadence skipped:      ${s.skippedSchedule}`,
    `Irregular schedules:  ${s.irregularCount}`,
    '',
    `Errors:               ${s.errorCount}`,
    `Blocked:              ${s.blockedCount}`,
    `Overdue checks:       ${s.overdueCount}`,
    '',
    `Started:  ${formatUtc(s.startedAt, true)}`,
    `Finished: ${formatUtc(s.finishedAt, true)}`,
    BANNER_RULE,
  ].join('\n');
}

/** "2026-09-09 01:06:12" (timeOnly=true gives just "01:06:12") */
function formatUtc(d: Date, timeOnly = false): string {
  const iso = d.toISOString(); // 2026-09-09T01:06:12.123Z
  const [datePart, timePart] = iso.split('T');
  const time = (timePart ?? '').slice(0, 8);
  return timeOnly ? time : `${datePart} ${time}`;
}

/** "2026-09-02 14:32 UTC" — for a chapter's published-at display */
export function formatPublishedAt(d: Date): string {
  const iso = d.toISOString();
  const [datePart, timePart] = iso.split('T');
  const hhmm = (timePart ?? '').slice(0, 5);
  return `${datePart} ${hhmm} UTC`;
}

/** "~2d 6h" from a millisecond duration until some future point. Negative
 *  input (already past) is clamped to "due now" rather than showing a
 *  confusing negative duration. */
export function formatTimeUntil(ms: number): string {
  if (ms <= 0) return 'due now';
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `~${hours}h`;
  if (hours === 0) return `~${days}d`;
  return `~${days}d ${hours}h`;
}

/** "~7d" or "~18h" from a millisecond interval — for the "Cadence: ~7d" line */
export function formatInterval(ms: number): string {
  const days = ms / (1000 * 60 * 60 * 24);
  if (days >= 1) {
    // Round to nearest whole day for display — the underlying value stays
    // precise for actual scheduling, this is purely cosmetic.
    return `~${Math.round(days)}d`;
  }
  const hours = Math.round(ms / (1000 * 60 * 60));
  return `~${hours}h`;
}

/** "ch59 7d, ch60 7d, ch61 8d" from a sequence of dated chapter entries */
export function formatReleaseGaps(dated: { date: Date; chapterNum: number }[]): string {
  if (dated.length < 2) return 'insufficient history';
  const gaps: string[] = [];
  for (let i = 1; i < dated.length; i++) {
    const curr = dated[i]!;
    const prev = dated[i - 1]!;
    const ms = curr.date.getTime() - prev.date.getTime();
    const days = ms / (1000 * 60 * 60 * 24);
    const gap = days >= 1 ? `${Math.round(days)}d` : `${Math.round(ms / (1000 * 60 * 60))}h`;
    gaps.push(`ch${Math.round(curr.chapterNum)} ${gap}`);
  }
  return gaps.join(', ');
}

export function logSourceOutcome(outcome: SourceOutcome): void {
  const lines = [
    `${humanizeSourceName(outcome.sourceUrl)} (${outcome.sourceUrl})`,
    `Manhwa ID: ${outcome.manhwaId}`,
  ];
  if (outcome.status === 'success') lines.push(`New chapters: ${outcome.newChapters}`);
  if (outcome.reason) lines.push(`Reason: ${outcome.reason}`);
  lines.push(`Time taken: ${formatDuration(outcome.durationMs)}`);
  const logFn = outcome.status === 'success' ? console.log : console.warn;
  logFn(`[sync] ${outcome.manhwaTitle}\n${lines.map(l => `  ${l}`).join('\n')}`);
}

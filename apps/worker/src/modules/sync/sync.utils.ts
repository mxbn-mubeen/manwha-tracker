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
 * Prints one source's outcome as a labeled block, matching the same shape
 * shown on the source's card in the UI.
 */
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

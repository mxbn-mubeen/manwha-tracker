/**
 * Website sync loop — separated from SyncService to stay under the 230-line limit.
 * Handles: FlareSolverr wake-up, per-source scraping, chapter insertion, and building result rows.
 */
import { SyncRepository } from '@manhwa-tracker/database';
import type { SyncResult, SyncSourceRow } from '@manhwa-tracker/shared';

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
function formatDuration(ms: number): string {
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

/** Wake up FlareSolverr before the sync loop so cold starts don't eat per-source timeouts. */
async function wakeFlareSolverr(): Promise<void> {
  const flareSolverrUrl = process.env.FLARESOLVERR_URL;
  if (!flareSolverrUrl) return;
  const wakeStart = Date.now();
  console.log('[sync] Waking up FlareSolverr...');
  try {
    await fetch(flareSolverrUrl.replace(/\/v1\/?$/, ''), {
      signal: AbortSignal.timeout(70_000),
    });
    console.log(`[sync] FlareSolverr ready in ${Date.now() - wakeStart}ms`);
  } catch {
    console.warn('[sync] FlareSolverr did not respond — Cloudflare sites may fail this run.');
  }
}

/**
 * Run the website sync loop. Mutates `result` in-place and returns the updated mutable reference.
 */
export async function runWebsiteSync(
  repo: SyncRepository,
  result: SyncResult,
): Promise<void> {
  const { getAdapter } = await import('@manhwa-tracker/parser');
  const webSources = await repo.getActiveSources('website');
  result.scannedSources = webSources.length;

  await wakeFlareSolverr();

  const updatedManhwaIds = new Set<number>();

  for (const source of webSources) {
    let outcome: SourceOutcome;
    const startMs = Date.now();

    try {
      const adapter = getAdapter(source.adapterKey, source.url);
      const chapters = await Promise.race([
        adapter.chapterList(source.url),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Sync operation timed out after 60 seconds.')), 60000)
        ),
      ]);

      if (chapters.length === 0) {
        outcome = {
          manhwaId: source.manhwaId,
          sourceUrl: source.url,
          manhwaTitle: source.manhwaTitle,
          status: 'error',
          chaptersFound: 0,
          newChapters: 0,
          reason: 'Got a response but found no chapters — site may be blocking the request.',
          durationMs: Date.now() - startMs,
        };
      } else {
        const existingNums = await repo.getExistingChapterNums(source.manhwaId);
        const newChapters = chapters.filter(c => !existingNums.has(c.chapterNum));

        let insertedCount = 0;
        if (newChapters.length > 0) {
          const chaptersToInsert = newChapters.map(chapter => ({
            manhwaId: source.manhwaId,
            sourceId: source.sourceId,
            chapterNum: chapter.chapterNum,
            title: chapter.title,
            url: chapter.url,
          }));
          insertedCount = await repo.insertChaptersBulk(chaptersToInsert);

          if (insertedCount > 0) {
            result.newChapters += insertedCount;
            if (!updatedManhwaIds.has(source.manhwaId)) {
              updatedManhwaIds.add(source.manhwaId);
              await repo.touchManhwaUpdatedAt(source.manhwaId);
            }
          }
        }

        const maxChapter = Math.max(...chapters.map(c => c.chapterNum));
        await repo.updateSourceSyncStatus(source.sourceId, maxChapter);

        outcome = {
          manhwaId: source.manhwaId,
          sourceUrl: source.url,
          manhwaTitle: source.manhwaTitle,
          status: 'success',
          chaptersFound: chapters.length,
          newChapters: insertedCount,
          reason: null,
          durationMs: Date.now() - startMs,
        };
      }
    } catch (err) {
      const isBlocked = err instanceof Error && err.name === 'CloudflareBlockedError';
      outcome = {
        manhwaId: source.manhwaId,
        sourceUrl: source.url,
        manhwaTitle: source.manhwaTitle,
        status: isBlocked ? 'blocked' : 'error',
        chaptersFound: 0,
        newChapters: 0,
        reason: describeSourceError(err),
        durationMs: Date.now() - startMs,
      };
      if (outcome.reason === 'Failed to check for updates.') {
        console.debug(`[sync] raw error for ${source.manhwaTitle} (${source.url}):`, err);
      }
    }

    logSourceOutcome(outcome);

    const rowStatus: SyncSourceRow['status'] =
      outcome.status === 'blocked' ? 'failed'
      : outcome.status === 'error' ? 'issue'
      : outcome.newChapters > 0 ? 'new'
      : 'no_new';

    result.rows.push({
      source: humanizeSourceName(outcome.sourceUrl),
      manhwaTitle: outcome.manhwaTitle,
      chapterFound: outcome.status === 'success' ? outcome.chaptersFound : null,
      status: rowStatus,
      reason: outcome.reason,
      durationMs: outcome.durationMs,
    });

    if (outcome.status !== 'success') {
      result.errors.push(`${source.manhwaTitle}: ${outcome.reason}`);
    }
  }

  result.updatedManhwa = updatedManhwaIds.size;
}

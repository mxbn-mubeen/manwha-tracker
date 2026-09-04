/**
 * Website sync loop — separated from SyncService to stay under the 230-line limit.
 * Handles: FlareSolverr wake-up, per-source scraping, chapter insertion, and building result rows.
 */
import { SyncRepository, SettingsRepository } from '@manhwa-tracker/database';
import type { SyncResult, SyncSourceRow } from '@manhwa-tracker/shared';

export const SYNC_PROGRESS_KEY = 'sys_sync_progress';

/** Write "N/total" to the settings table so the API can expose live progress. */
export async function setSyncProgress(completed: number, total: number): Promise<void> {
  const repo = new SettingsRepository();
  await repo.set(SYNC_PROGRESS_KEY, `${completed}/${total}`);
}

/** Clear progress so the UI shows "Syncing…" not stale numbers. */
export async function clearSyncProgress(): Promise<void> {
  const repo = new SettingsRepository();
  await repo.delete(SYNC_PROGRESS_KEY);
}

import { 
  type SourceOutcome,
  humanizeSourceName,
  describeSourceError,
  logSourceOutcome 
} from './sync.utils';
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
    const elapsedSec = ((Date.now() - wakeStart) / 1000).toFixed(1);
    console.log(`[sync] FlareSolverr ready in ${elapsedSec}s`);
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
  const webSourcesGrouped = await repo.getActiveSourcesGroupedByManhwa('website');
  
  let totalSourcesCount = 0;
  for (const sources of webSourcesGrouped.values()) {
    totalSourcesCount += sources.length;
  }
  result.scannedSources = totalSourcesCount;

  await wakeFlareSolverr();
  const updatedManhwaIds = new Set<number>();
  let completedCount = 0;

  // Write "0/total" immediately so the UI shows a real count right away
  await setSyncProgress(0, webSourcesGrouped.size);

  async function processManhwaSources(manhwaId: number, sources: any[]): Promise<void> {
    const manhwaTitle = sources[0].manhwaTitle;
    let winnerSourceId: number | null = null;
    
    // Check Cadence (Skip Schedule)
    const recentDates = await repo.getChapterReleaseDates(manhwaId);
    if (recentDates.length >= 3) {
      let totalDiffMs = 0;
      for (let i = 1; i < recentDates.length; i++) {
        const d1 = recentDates[i];
        const d0 = recentDates[i - 1];
        if (d1 && d0) {
          totalDiffMs += d1.getTime() - d0.getTime();
        }
      }
      const medianIntervalMs = totalDiffMs / (recentDates.length - 1);
      
      const lastRelease = recentDates[recentDates.length - 1];
      const lastReleaseTime = lastRelease ? lastRelease.getTime() : Date.now();
      const nextExpectedTime = lastReleaseTime + medianIntervalMs;
      
      // If it's not due yet (and we haven't passed double the interval in case it's late)
      if (Date.now() < nextExpectedTime && Date.now() < lastReleaseTime + (medianIntervalMs * 2)) {
        result.skippedSchedule += sources.length;
        console.log(`[sync] Skipping ${manhwaTitle} — not due yet (next expected in ${Math.round((nextExpectedTime - Date.now()) / (1000 * 60 * 60 * 24))} days)`);
        return;
      }
    }

    const existingNums = await repo.getExistingChapterNums(manhwaId);
    const existingMax = existingNums.size > 0 ? Math.max(...existingNums) : 0;

    // Process sources sequentially based on priority
    for (const source of sources) {
      let outcome: SourceOutcome;
      const startMs = Date.now();

      try {
        const adapter = getAdapter(source.adapterKey, source.url);
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Sync operation timed out after 60 seconds.')), 60000);
        });

        let chapters: any[] = [];
        try {
          const fetchPromise = adapter.chapterList(source.url);
          fetchPromise.catch(() => {}); 
          chapters = await Promise.race([fetchPromise, timeoutPromise]);
        } finally {
          clearTimeout(timeoutId!);
        }

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
          const maxChapter = Math.max(...chapters.map((c: any) => c.chapterNum));

          const REGRESSION_THRESHOLD = 0.5; // 50 %
          if (
            existingMax > 0 &&
            chapters.length > 0 &&
            maxChapter < existingMax * REGRESSION_THRESHOLD
          ) {
            outcome = {
              manhwaId: source.manhwaId,
              sourceUrl: source.url,
              manhwaTitle: source.manhwaTitle,
              status: 'error',
              chaptersFound: chapters.length,
              newChapters: 0,
              reason: `Detected chapter ${maxChapter} but ${existingMax} chapters already exist for this manhwa — likely a parsing failure, skipped this result.`,
              durationMs: Date.now() - startMs,
            };
          } else {
            const newChapters = chapters.filter((c: any) => !existingNums.has(c.chapterNum));

            let insertedCount = 0;
            if (newChapters.length > 0) {
              const chaptersToInsert = newChapters.map((chapter: any) => ({
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
            
            if (!winnerSourceId && maxChapter > existingMax) {
               winnerSourceId = source.sourceId; // First to find new chapters wins
            }
          }
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
      }

      logSourceOutcome(outcome);

      const rowStatus: SyncSourceRow['status'] =
        outcome.status === 'blocked' ? 'failed'
        : outcome.status === 'error' ? 'issue'
        : outcome.newChapters > 0 ? 'new'
        : 'no_new';

      result.rows.push({
        source: humanizeSourceName(outcome.sourceUrl),
        manhwaId: outcome.manhwaId,
        manhwaTitle: outcome.manhwaTitle,
        chapterFound: outcome.status === 'success' ? outcome.chaptersFound : null,
        status: rowStatus,
        reason: outcome.reason || null,
        durationMs: outcome.durationMs,
      });

      // Break logic: if this source was successful, and its chapter count
      // is at least as high as what we historically know about, it's "leading".
      // We don't need to check backup sources for this manhwa.
      if (outcome.status === 'success' && outcome.chaptersFound > 0 && Math.max(0, existingMax) <= outcome.chaptersFound) {
        break; // Skip remaining backup sources
      }
    }
    
    // After checking sources, promote the winner (if any source found more than existingMax)
    if (winnerSourceId) {
       await repo.promoteLeadingSource(manhwaId, winnerSourceId);
    }
  }

  // Iterate over each manhwa sequentially
  const entries = Array.from(webSourcesGrouped.entries());
  for (const [manhwaId, sources] of entries) {
    try {
      await processManhwaSources(manhwaId, sources);
    } catch (e: any) {
      result.errors.push(`Group processing failed for manhwa ${manhwaId}: ${e.message}`);
    }
    completedCount++;
    await setSyncProgress(completedCount, webSourcesGrouped.size);
  }

  result.updatedManhwa = updatedManhwaIds.size;

  // Clear progress key so isSyncing=false and progress=null appear atomically
  await clearSyncProgress();
}

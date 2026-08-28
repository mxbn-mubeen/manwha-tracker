import { SyncRepository } from './sync.repository';
import { SettingsRepository } from '@manhwa-tracker/database';
import type { SyncScope, SyncResult, SyncSourceRow, SyncRun } from '@manhwa-tracker/shared';

const IS_SYNCING_KEY = 'sys_is_syncing';

// If a sync claims to still be running after this long, treat the lock as
// abandoned rather than trust it forever. A legitimate run finishes well
// under this — sequential per-source sync caps each source at 60s and the
// FlareSolverr wake-up at 70s, so even a large library shouldn't approach
// 15 minutes. This exists because the lock is only released by a `finally`
// block in `run()`, which never executes if the process is killed from the
// outside mid-run (e.g. the GitHub Actions cron's `timeout-minutes: 10`
// firing on a slow run, or a Render redeploy tearing down the worker) —
// without this check, a single killed run leaves every future page load
// showing "Syncing..." forever until something else calls run() to clear it.
const STALE_LOCK_MS = 15 * 60 * 1000;

export async function getIsSyncing(): Promise<boolean> {
  const repo = new SettingsRepository();
  const val = await repo.get(IS_SYNCING_KEY);
  if (val !== 'true') return false;

  const updatedAt = await repo.getUpdatedAt(IS_SYNCING_KEY);
  if (updatedAt && Date.now() - updatedAt.getTime() > STALE_LOCK_MS) {
    console.warn(
      `[sync] sys_is_syncing has been true since ${updatedAt.toISOString()} — ` +
      'treating as an abandoned lock from a killed run and clearing it.',
    );
    await repo.set(IS_SYNCING_KEY, 'false');
    return false;
  }
  return true;
}

export async function setIsSyncing(value: boolean): Promise<void> {
  const repo = new SettingsRepository();
  await repo.set(IS_SYNCING_KEY, value ? 'true' : 'false');
}
export async function getSyncHistory(): Promise<SyncRun[]> {
  const repo = new SyncRepository();
  const runs = await repo.getRecentSyncRuns(20);
  
  // The UI and shared types expect 'runAt' as a Date, which it is since Neon returns it that way
  // We need to map `SyncRunRow` back to the shared `SyncRun` interface if needed,
  // but they're basically identical now except for the id.
  return runs as any[];
}


type SourceOutcome = {
  manhwaId: number;
  sourceUrl: string;
  manhwaTitle: string;
  status: 'success' | 'blocked' | 'error';
  chaptersFound: number;
  newChapters: number;
  reason: string | null; // toast-safe description; null on success
};


/** "https://comix.to/title/..." -> "Comix". Falls back to the raw hostname if it doesn't parse. */
function humanizeSourceName(url: string): string {
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    const base = host.replace(/^www\./, '').split('.')[0] || host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return url;
  }
}

/**
 * Prints one source's outcome as a labeled block, matching the same
 * Status/Last attempt/Chapters found/Reason shape shown on the source's
 * card in the UI — so `docker logs` / server output is scannable at a
 * glance instead of one dense line per source.
 */
function logSourceOutcome(outcome: SourceOutcome): void {
  const lines = [
    `${humanizeSourceName(outcome.sourceUrl)} (${outcome.sourceUrl})`,
    `Manhwa ID: ${outcome.manhwaId}`,
    `Status: ${outcome.status.toUpperCase()}`,
    `Last attempt: just now`,
    `Chapters found: ${outcome.chaptersFound}`,
  ];
  if (outcome.status === 'success') {
    lines.push(`New chapters: ${outcome.newChapters}`);
  }
  if (outcome.reason) {
    lines.push(`Reason: ${outcome.reason}`);
  }
  const logFn = outcome.status === 'success' ? console.log : console.warn;
  logFn(`[sync] ${outcome.manhwaTitle}\n${lines.map(l => `  ${l}`).join('\n')}`);
}

/**
 * Per-source sync failures come straight from the site adapter (fetch/cheerio) —
 * `result.errors[0]` is shown verbatim in the navbar Sync button's toast
 * (see AppShell.tsx), so a raw "Cannot read properties of null (reading
 * 'textContent')" or an axios stack should never end up in there.
 */
function describeSourceError(err: unknown): string {
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

  // Unknown shape — still useful to know *something* broke, but don't forward
  // raw stack/driver text into a toast description.
  return 'Failed to check for updates.';
}

export class SyncService {
  private repo: SyncRepository;

  constructor() {
    this.repo = new SyncRepository();
  }

  async run(scope: SyncScope = 'all'): Promise<SyncResult> {
    const isCurrentlySyncing = await getIsSyncing();
    if (isCurrentlySyncing) {
      throw new Error("Sync is already running in the background");
    }
    await setIsSyncing(true);
    try {
      const start = Date.now();
      const result: SyncResult = {
        scannedSources: 0,
        newChapters: 0,
        updatedManhwa: 0,
        skippedTelegram: 0,
        errors: [],
        duration: 0,
        rows: [],
      };

    const includeWebsites = scope === 'websites' || scope === 'all';
    const includeTelegram = scope === 'telegram' || scope === 'all';

    if (includeTelegram) {
      const telegramSources = await this.repo.getActiveSources('telegram');
      result.skippedTelegram = telegramSources.length;
      // Note: Telegram sources are skipped during manual sync because they are handled
      // by the background watcher process (watch:telegram).
    }

    if (includeWebsites) {
      // Lazy import: parser pulls in cheerio, no need to load it for telegram-only runs
      const { getAdapter } = await import('@manhwa-tracker/parser');
      const webSources = await this.repo.getActiveSources('website');
      result.scannedSources = webSources.length;

      // Wake up FlareSolverr before processing sources.
      // On Render's free tier, the FlareSolverr instance sleeps after 15 min idle.
      // Cold-starting it takes 30–60s — long enough to eat the entire 60s per-source
      // timeout and cause every Cloudflare site to fail on the first sync after idle.
      // Pinging it here gives it time to fully boot before we need it.
      const flareSolverrUrl = process.env.FLARESOLVERR_URL;
      if (flareSolverrUrl) {
        const wakeStart = Date.now();
        console.log('[sync] Waking up FlareSolverr...');
        try {
          await fetch(flareSolverrUrl.replace(/\/v1\/?$/, ''), {
            signal: AbortSignal.timeout(70_000), // generous — cold start can take 60s
          });
          console.log(`[sync] FlareSolverr ready in ${Date.now() - wakeStart}ms`);
        } catch {
          console.warn('[sync] FlareSolverr did not respond — Cloudflare sites may fail this run.');
        }
      }

      const updatedManhwaIds = new Set<number>();

      for (const source of webSources) {
        let outcome: SourceOutcome;

        try {
          const adapter = getAdapter(source.adapterKey, source.url);
          
          // Strict 60-second timeout to prevent sync from hanging indefinitely
          const chapters = await Promise.race([
            adapter.chapterList(source.url),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Sync operation timed out after 60 seconds.')), 60000)
            )
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
            };
          } else {
            const existingNums = await this.repo.getExistingChapterNums(source.manhwaId);
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
              insertedCount = await this.repo.insertChaptersBulk(chaptersToInsert);

              if (insertedCount > 0) {
                result.newChapters += insertedCount;
                if (!updatedManhwaIds.has(source.manhwaId)) {
                  updatedManhwaIds.add(source.manhwaId);
                  await this.repo.touchManhwaUpdatedAt(source.manhwaId);
                }
              }
            }

            outcome = {
              manhwaId: source.manhwaId,
              sourceUrl: source.url,
              manhwaTitle: source.manhwaTitle,
              status: 'success',
              chaptersFound: chapters.length,
              newChapters: insertedCount,
              reason: null,
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
          };
          // Full stack still goes to the logs (just quieter than the status
          // block above) — the classified `reason` is what's user-facing,
          // but the raw error is what you actually need to debug an unknown one.
          if (outcome.reason === 'Failed to check for updates.') {
            console.debug(`[sync] raw error for ${source.manhwaTitle} (${source.url}):`, err);
          }
        }

        logSourceOutcome(outcome);

        // Map internal outcome status → 4 user-facing statuses
        const rowStatus: SyncSourceRow['status'] =
          outcome.status === 'blocked' ? 'failed'
          : outcome.status === 'error' ? 'issue'
          : outcome.newChapters > 0 ? 'new'
          : 'no_new';

        result.rows.push({
          source: humanizeSourceName(outcome.sourceUrl),
          manhwaTitle: outcome.manhwaTitle,
          chapterFound: outcome.chaptersFound > 0 ? outcome.chaptersFound : null,
          status: rowStatus,
          reason: outcome.reason,
        });

        if (outcome.status !== 'success') {
          result.errors.push(`${source.manhwaTitle}: ${outcome.reason}`);
        }
      }

      result.updatedManhwa = updatedManhwaIds.size;
    }

    result.duration = Date.now() - start;

    // Push to database history
    await this.repo.insertSyncRun({
      scannedSources: result.scannedSources,
      newChapters: result.newChapters,
      updatedManhwa: result.updatedManhwa,
      skippedTelegram: result.skippedTelegram,
      errors: result.errors,
      rows: result.rows,
      duration: result.duration,
    });

    return result;
    } finally {
      await setIsSyncing(false);
    }
  }
}

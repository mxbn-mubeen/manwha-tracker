import { SyncRepository, SettingsRepository } from '@manhwa-tracker/database';
import type { SyncScope, SyncResult, SyncRun } from '@manhwa-tracker/shared';
import { runWebsiteSync } from './sync.website';

const IS_SYNCING_KEY = 'sys_is_syncing';

// If a sync claims to still be running after this long, treat the lock as
// abandoned rather than trust it forever (e.g. process killed mid-run by
// GitHub Actions cron timeout-minutes or a Render redeploy).
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
  return runs as any[];
}

export class SyncService {
  private repo: SyncRepository;

  constructor() {
    this.repo = new SyncRepository();
  }

  async run(scope: SyncScope = 'all', triggeredBy: string = 'manual'): Promise<SyncResult> {
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
        skippedSchedule: 0,
        errors: [],
        duration: 0,
        triggeredBy,
        rows: [],
      };

      try {
        const includeWebsites = scope === 'websites' || scope === 'all';
        const includeTelegram = scope === 'telegram' || scope === 'all';

        if (includeTelegram) {
          const telegramSources = await this.repo.getActiveSources('telegram');
          result.skippedTelegram = telegramSources.length;
          // Telegram sources are handled by the background watcher process (watch:telegram).
        }

        if (includeWebsites) {
          await runWebsiteSync(this.repo, result);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`Sync aborted due to critical error: ${message}`);
        console.error('[sync] Critical error during run:', err);
      }

      result.duration = Date.now() - start;

      await this.repo.insertSyncRun({
        scannedSources: result.scannedSources,
        newChapters: result.newChapters,
        updatedManhwa: result.updatedManhwa,
        skippedTelegram: result.skippedTelegram,
        errors: result.errors,
        rows: result.rows,
        duration: result.duration,
        triggeredBy: result.triggeredBy,
      });

      return result;
    } finally {
      await setIsSyncing(false);
    }
  }
}

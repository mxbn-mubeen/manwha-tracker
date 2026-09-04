import { SyncRepository, SettingsRepository } from '@manhwa-tracker/database';
import type { SyncRun } from '@manhwa-tracker/shared';

const IS_SYNCING_KEY = 'sys_is_syncing';
const SYNC_PROGRESS_KEY = 'sys_sync_progress';

// If a sync claims to still be running after this long with no signs of progress,
// treat the lock as abandoned rather than trust it forever.
const STALE_LOCK_MS = 30 * 60 * 1000;

/**
 * Reads the DB lock that the worker sets when a sync is running.
 * The API never runs a sync itself — it only reads this state for the
 * `sync.isSyncing` tRPC query so the frontend can show a spinner.
 */
export async function getIsSyncing(): Promise<boolean> {
  const repo = new SettingsRepository();
  const val = await repo.get(IS_SYNCING_KEY);
  if (val !== 'true') return false;

  // Check the progress key for the most recent sign of life, as the isSyncing
  // key is only set once at the start of the run.
  let lastActiveAt = await repo.getUpdatedAt(SYNC_PROGRESS_KEY);
  if (!lastActiveAt) {
    lastActiveAt = await repo.getUpdatedAt(IS_SYNCING_KEY);
  }

  if (lastActiveAt && Date.now() - lastActiveAt.getTime() > STALE_LOCK_MS) {
    console.warn(
      `[sync] sys_is_syncing has been true but inactive since ${lastActiveAt.toISOString()} — ` +
      'treating as an abandoned lock from a killed run and clearing it.',
    );
    await repo.set(IS_SYNCING_KEY, 'false');
    return false;
  }
  return true;
}

/** Force-clear the sync lock (use when a run was killed and the lock is stuck). */
export async function setIsSyncing(value: boolean): Promise<void> {
  const repo = new SettingsRepository();
  await repo.set(IS_SYNCING_KEY, value ? 'true' : 'false');
}

/** Force-clear the progress counter. */
export async function clearSyncProgress(): Promise<void> {
  const repo = new SettingsRepository();
  await repo.delete(SYNC_PROGRESS_KEY);
}

/**
 * Returns the last 20 sync run records from the DB.
 * Actual sync execution lives on the worker — this is read-only.
 */
export async function getSyncHistory(): Promise<SyncRun[]> {
  const repo = new SyncRepository();
  const runs = await repo.getRecentSyncRuns(20);
  return runs as any[];
}

/**
 * Returns live sync progress as { completed, total } while a sync is running,
 * or null if no sync is in progress (key is cleared when sync finishes).
 */
export async function getSyncProgress(): Promise<{ completed: number; total: number } | null> {
  const repo = new SettingsRepository();
  const val = await repo.get(SYNC_PROGRESS_KEY);
  if (!val) return null;
  const [completedStr, totalStr] = val.split('/');
  const completed = parseInt(completedStr ?? '0', 10);
  const total = parseInt(totalStr ?? '0', 10);
  if (isNaN(completed) || isNaN(total) || total === 0) return null;
  return { completed, total };
}

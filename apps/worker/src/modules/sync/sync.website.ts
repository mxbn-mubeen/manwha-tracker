/**
 * Website sync loop — separated from SyncService to stay under the 230-line limit.
 * Handles: FlareSolverr wake-up, per-source scraping, chapter insertion, and building result rows.
 */
import { SyncRepository, SettingsRepository } from "@manhwa-tracker/database";
import type { SyncResult, SyncSourceRow } from "@manhwa-tracker/shared";

export const SYNC_PROGRESS_KEY = "sys_sync_progress";

/** Write "N/total" to the settings table so the API can expose live progress. */
export async function setSyncProgress(
  completed: number,
  total: number,
): Promise<void> {
  const repo = new SettingsRepository();
  await repo.set(SYNC_PROGRESS_KEY, `${completed}/${total}`);
}

/** Clear progress so the UI shows "Syncing…" not stale numbers. */
export async function clearSyncProgress(): Promise<void> {
  const repo = new SettingsRepository();
  await repo.delete(SYNC_PROGRESS_KEY);
}

import { processManhwaSources } from "./sync.processor";
/** Wake up FlareSolverr before the sync loop so cold starts don't eat per-source timeouts. */
async function wakeFlareSolverr(): Promise<void> {
  const flareSolverrUrl = process.env.FLARESOLVERR_URL;
  if (!flareSolverrUrl) return;
  const wakeStart = Date.now();
  console.log("[sync] Waking up FlareSolverr...");
  try {
    await fetch(flareSolverrUrl.replace(/\/v1\/?$/, ""), {
      signal: AbortSignal.timeout(70_000),
    });
    const elapsedSec = ((Date.now() - wakeStart) / 1000).toFixed(1);
    console.log(`[sync] FlareSolverr ready in ${elapsedSec}s`);
  } catch {
    console.warn(
      "[sync] FlareSolverr did not respond — Cloudflare sites may fail this run.",
    );
  }
}

/**
 * Run the website sync loop. Mutates `result` in-place and returns the updated mutable reference.
 */
export async function runWebsiteSync(
  repo: SyncRepository,
  result: SyncResult,
): Promise<void> {
  const { getAdapter } = await import("@manhwa-tracker/parser");
  const webSourcesGrouped =
    await repo.getActiveSourcesGroupedByManhwa("website");

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



  // Iterate over each manhwa sequentially
  const entries = Array.from(webSourcesGrouped.entries());
  for (const [manhwaId, sources] of entries) {
    try {
      await processManhwaSources(manhwaId, sources, repo, result, updatedManhwaIds);
    } catch (e: any) {
      result.errors.push(
        `Group processing failed for manhwa ${manhwaId}: ${e.message}`,
      );
    }
    completedCount++;
    await setSyncProgress(completedCount, webSourcesGrouped.size);
  }

  result.updatedManhwa = updatedManhwaIds.size;

  // Clear progress key so isSyncing=false and progress=null appear atomically
  await clearSyncProgress();
}

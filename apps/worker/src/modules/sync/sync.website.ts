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

const WEEKLY_REFRESH_SETTINGS_KEY = "sys_last_weekly_cadence_refresh";
// How long to wait before allowing the trigger to fire again. Needs to be
// long enough that the ~48 half-hour sync cycles that happen over a single
// Sunday don't all re-trigger it, but short enough that a slightly early or
// late cron run still catches it. 20 hours gives real margin either way.
const WEEKLY_REFRESH_COOLDOWN_MS = 20 * 60 * 60 * 1000;

/**
 * Returns true exactly once per week — on the first sync cycle that lands
 * on or after Sunday 00:00 UTC — and false every other time. This is a
 * global override, separate from (and stronger than) the per-manhwa cadence
 * prediction and the per-source 7-day staleness floor: once a week, every
 * source in the entire library gets a real check regardless of what cadence
 * currently predicts, so the release-pattern data for the whole library
 * gets a scheduled full recalibration rather than relying purely on
 * per-source drift-based triggers.
 *
 * Uses UTC — consistent with every other timestamp in this project (the
 * GitHub Actions cron schedule, all logged sync timestamps). If "Sunday
 * midnight" was meant in a different timezone, this will fire at the wrong
 * local time.
 */
async function checkAndClaimWeeklyRefresh(): Promise<boolean> {
  const now = new Date();
  if (now.getUTCDay() !== 0 /* Sunday */) return false;

  const repo = new SettingsRepository();
  const lastRefreshStr = await repo.get(WEEKLY_REFRESH_SETTINGS_KEY);
  const lastRefresh = lastRefreshStr ? new Date(lastRefreshStr) : null;
  const msSinceLastRefresh = lastRefresh ? now.getTime() - lastRefresh.getTime() : Infinity;

  if (msSinceLastRefresh <= WEEKLY_REFRESH_COOLDOWN_MS) return false; // already fired this week

  await repo.set(WEEKLY_REFRESH_SETTINGS_KEY, now.toISOString());
  return true;
}

import { processManhwaSources } from "./sync.processor";
import { renderSyncStartBanner } from "./sync.utils";
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
 *
 * @param options.forceFullRefresh Bypass cadence entirely for this run, same
 *   effect as the automatic Sunday trigger — used by the manual "Full
 *   Refresh" button and by individual-manhwa "Sync Now".
 * @param options.refreshReason Label shown in the terminal log when
 *   forceFullRefresh is active, so a manual refresh and the Sunday auto
 *   trigger are distinguishable in the logs even though they share the
 *   exact same code path.
 * @param options.manhwaIds Scope the run to only these manhwa (used by
 *   individual "Sync Now"). When provided, this run does NOT claim the
 *   weekly Sunday refresh slot — a single-title sync isn't a real
 *   full-library recalibration, so it shouldn't prevent the real one from
 *   firing later that day.
 */
export async function runWebsiteSync(
  repo: SyncRepository,
  result: SyncResult,
  options?: { forceFullRefresh?: boolean; refreshReason?: string; manhwaIds?: number[] },
): Promise<void> {
  const { getAdapter } = await import("@manhwa-tracker/parser");
  const webSourcesGroupedFull =
    await repo.getActiveSourcesGroupedByManhwa("website");

  const isScoped = !!options?.manhwaIds && options.manhwaIds.length > 0;
  let webSourcesGrouped = webSourcesGroupedFull;
  if (isScoped) {
    const idSet = new Set(options!.manhwaIds);
    webSourcesGrouped = new Map(
      Array.from(webSourcesGroupedFull.entries()).filter(([manhwaId]) => idSet.has(manhwaId)),
    );
  }

  let totalSourcesCount = 0;
  for (const sources of webSourcesGrouped.values()) {
    totalSourcesCount += sources.length;
  }
  result.scannedSources = totalSourcesCount;

  const mode = result.triggeredBy === "manual" ? "manual" : "scheduled";
  console.log(renderSyncStartBanner(webSourcesGrouped.size, mode, new Date()));

  // A scoped (single-manhwa) sync never claims the weekly slot — see this
  // function's doc comment above for why.
  const isSundayAutoRefresh = isScoped ? false : await checkAndClaimWeeklyRefresh();
  const forceFullCheck = isSundayAutoRefresh || (options?.forceFullRefresh ?? false);
  const refreshReason = isSundayAutoRefresh
    ? "Sunday 00:00 UTC full recalibration"
    : (options?.refreshReason ?? "Full refresh");

  if (forceFullCheck) {
    console.log(
      `[sync] 🔄 ${refreshReason} — every source in this run gets a real check, regardless of cadence prediction.`
    );
  }

  await wakeFlareSolverr();
  const updatedManhwaIds = new Set<number>();
  let completedCount = 0;

  // Write "0/total" immediately so the UI shows a real count right away
  await setSyncProgress(0, webSourcesGrouped.size);

  // Iterate over each manhwa sequentially
  const entries = Array.from(webSourcesGrouped.entries());
  const total = entries.length;
  let index = 0;
  for (const [manhwaId, sources] of entries) {
    index++;
    try {
      await processManhwaSources(manhwaId, sources, repo, result, updatedManhwaIds, index, total, forceFullCheck, refreshReason);
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

import { SyncRepository } from "@manhwa-tracker/database";
import type { SyncResult, SyncSourceRow } from "@manhwa-tracker/shared";
import { getAdapter } from "@manhwa-tracker/parser";
import {
  type SourceOutcome,
  humanizeSourceName,
  describeSourceError,
  renderTreeBlock,
  formatPublishedAt,
  formatTimeUntil,
  formatInterval,
  formatReleaseGaps,
} from "./sync.utils";
import { evaluateCadence } from "@manhwa-tracker/utils";
import { processSingleSource } from "./sync.source-processor";

// If an individual source hasn't had a real check in this long, force one
// regardless of what the manhwa-level cadence prediction says. This is a
// per-source floor, separate from the per-manhwa 3x-overdue override: a
// manhwa can have multiple sources with very different check histories
// (one gets re-verified often because it keeps finding new chapters, another
// sits untouched because cadence keeps predicting "not due yet" for it
// specifically) — this guarantees no single source's underlying release
// data ever goes stale indefinitely, keeping the cadence pattern for every
// source honest and self-updating rather than trusting one old snapshot
// forever.
const WEEKLY_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

function isSourceStale(source: any): boolean {
  if (!source.lastSyncedAt) return true; // never checked — definitely force it
  return Date.now() - new Date(source.lastSyncedAt).getTime() > WEEKLY_REFRESH_MS;
}

export async function processManhwaSources(
  manhwaId: number,
  sources: any[],
  repo: SyncRepository,
  result: SyncResult,
  updatedManhwaIds: Set<number>,
  index: number,
  total: number,
  forceFullCheck: boolean = false,
  refreshReason: string = "Full refresh"
): Promise<void> {
  const manhwaTitle = sources[0].manhwaTitle;
  let winnerSourceId: number | null = null;

  result.manhwaChecked++;

  const header = `[SYNC] ${String(index).padStart(3, "0")}/${total}  ${manhwaTitle}`;
  const lines: string[] = [`ID: ${manhwaId}`];

  try {
    // Fetch WITH provenance so the terminal can honestly show whether the
    // cadence math is running on real website publication timestamps or a
    // discoveredAt fallback — an important distinction while validating
    // that Phase 1's cadence system is actually learning from the sites
    // themselves, not just from our own sync schedule.
    const dated = await repo.getChapterReleaseDatesWithSource(manhwaId);
    const dates = dated.map((d) => d.date);
    const hasRealTimestamps = dated.some((d) => d.isReal);
    const now = Date.now();
    const decision = evaluateCadence(dates, now);

    if (forceFullCheck) {
      // Global override — takes priority over every other cadence outcome.
      // Still shows whatever pattern info is available, purely for visibility;
      // it has no bearing on whether this manhwa gets checked this run.
      // Same code path regardless of what triggered it (Sunday auto, manual
      // full refresh, or an individual manhwa sync) — only the displayed
      // reason differs.
      if (dated.length >= 2) {
        lines.push(`Website releases: ${formatReleaseGaps(dated)}`);
      }
      if (decision.medianIntervalMs > 0) {
        lines.push(`Cadence: ${formatInterval(decision.medianIntervalMs)}`);
      }
      lines.push("Status: 🔄 Full check");
      lines.push(`Reason: ${refreshReason}`);
      lines.push("Action: Full check");
      // No skipping, no source filtering — every source in `sources` falls
      // through to the real per-source loop below, unchanged.
    } else if (decision.insufficientData) {
      lines.push("Website releases: insufficient history");
      lines.push("Cadence: —");
      lines.push("Pattern: — Insufficient data");
      lines.push(`Releases available: ${dated.length}`);
      lines.push("Action: Full check");
    } else {
      lines.push(`Website releases: ${formatReleaseGaps(dated)}`);
      lines.push(`Cadence: ${formatInterval(decision.medianIntervalMs)}`);
      lines.push(`Pattern: ${decision.isIrregular ? "⚠ Irregular" : "✓ Regular"}`);

      // This is the terminology distinction called out explicitly: only
      // say "Last published" when the date is a real website timestamp.
      // Otherwise, say plainly that it's a discoveredAt fallback — never
      // let the log imply a website-derived time when it wasn't one.
      if (hasRealTimestamps) {
        const last = dates[dates.length - 1];
        if (last) lines.push(`Last published: ${formatPublishedAt(last)}`);
      } else {
        lines.push("Timestamp: ⚠ Discovery fallback");
      }

      if (decision.isIrregular) {
        lines.push("Action: Full check");
        result.irregularCount++;
        // Visible in Sync History too, not just the console — otherwise an
        // irregular title's cadence bypass looks identical to "cadence
        // wasn't even attempted," which makes debugging harder later.
        result.rows.push({
          source: "cadence",
          manhwaId,
          manhwaTitle,
          chapterFound: null,
          status: "no_new",
          reason: `Cadence bypassed — irregular release pattern (MAD/median = ${(decision.madMs / decision.medianIntervalMs).toFixed(2)}), checking every run instead of predicting.`,
          durationMs: 0,
        });
      } else if (decision.shouldSkip && decision.nextExpectedTime !== null) {
        const staleSources = sources.filter(isSourceStale);
        const freshSources = sources.filter((s) => !isSourceStale(s));

        if (staleSources.length === 0) {
          // Every source was checked recently enough — genuinely skip all of them.
          result.skippedSchedule += sources.length;
          lines.push("Status: ⏭ Skipped");
          lines.push("Reason: Not due yet");
          lines.push(`Expected: ${formatTimeUntil(decision.nextExpectedTime - now)}`);
          for (const source of sources) {
            result.rows.push({
              source: humanizeSourceName(source.url),
              manhwaId: source.manhwaId,
              manhwaTitle: source.manhwaTitle,
              chapterFound: null,
              status: "skipped",
              reason: `Skipped by cadence check (next expected in ${Math.round((decision.nextExpectedTime - now) / (1000 * 60 * 60 * 24))} days)`,
              durationMs: 0,
            });
          }
          console.log(renderTreeBlock(header, lines));
          return; // skipped — no per-source checks to run
        }

        // At least one source is overdue for a weekly refresh — skip the
        // fresh ones as normal, but fall through to the real per-source
        // loop below for the stale ones, so their pattern data can update.
        lines.push("Status: ⏭ Partially skipped");
        lines.push(`Reason: Not due yet, but ${staleSources.length} source(s) overdue for weekly refresh`);
        for (const source of freshSources) {
          result.skippedSchedule += 1;
          result.rows.push({
            source: humanizeSourceName(source.url),
            manhwaId: source.manhwaId,
            manhwaTitle: source.manhwaTitle,
            chapterFound: null,
            status: "skipped",
            reason: `Skipped by cadence check (next expected in ${Math.round((decision.nextExpectedTime - now) / (1000 * 60 * 60 * 24))} days)`,
            durationMs: 0,
          });
        }
        sources = staleSources; // only these proceed to the real check below
      } else if (decision.isOverdue) {
        lines.push("Status: ⚠ Overdue");
        lines.push("Reason: 3× cadence threshold reached");
        lines.push("Action: Full check");
        result.overdueCount++;
      }
      // else: ordinarily due — falls through to per-source checks below
      // with no extra status line, matching the normal case where nothing
      // unusual needs flagging before the real result.
    }
  } catch (cadenceErr: any) {
    console.warn(
      `[sync] Cadence check failed for ${manhwaTitle}, syncing anyway:`,
      cadenceErr?.message ?? cadenceErr
    );
    lines.push("Website releases: unavailable");
    lines.push("Cadence: — (check failed, syncing anyway)");
  }

  const existingNums = await repo.getExistingChapterNums(manhwaId);
  const existingMax = existingNums.size > 0 ? Math.max(...existingNums) : 0;

  for (const source of sources) {
    const { outcome, isWinner } = await processSingleSource(
      source,
      existingMax,
      existingNums,
      repo,
      result,
      updatedManhwaIds,
      lines
    );
    if (!winnerSourceId && isWinner) winnerSourceId = source.sourceId;

    if (
      !forceFullCheck &&
      outcome.status === "success" &&
      outcome.maxChapterNum > existingMax
    ) {
      break;
    }
  }

  console.log(renderTreeBlock(header, lines));

  if (winnerSourceId) {
    await repo.promoteLeadingSource(manhwaId, winnerSourceId);
  }
}

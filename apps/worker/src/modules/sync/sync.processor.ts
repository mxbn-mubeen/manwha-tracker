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
import { evaluateCadence } from "./cadence";

export async function processManhwaSources(
  manhwaId: number,
  sources: any[],
  repo: SyncRepository,
  result: SyncResult,
  updatedManhwaIds: Set<number>,
  index: number,
  total: number
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

    if (decision.insufficientData) {
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
    let outcome: SourceOutcome;
    const startMs = Date.now();

    try {
      const adapter = getAdapter(source.adapterKey, source.url);
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Sync operation timed out after 60 seconds.")),
          60000
        );
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
          status: "error",
          chaptersFound: 0,
          newChapters: 0,
          reason:
            "Got a response but found no chapters — site may be blocking the request.",
          durationMs: Date.now() - startMs,
        };
      } else {
        const maxChapter = Math.max(...chapters.map((c: any) => c.chapterNum));
        const REGRESSION_THRESHOLD = 0.5;

        if (
          existingMax > 0 &&
          chapters.length > 0 &&
          maxChapter < existingMax * REGRESSION_THRESHOLD
        ) {
          outcome = {
            manhwaId: source.manhwaId,
            sourceUrl: source.url,
            manhwaTitle: source.manhwaTitle,
            status: "error",
            chaptersFound: chapters.length,
            newChapters: 0,
            reason: `Detected chapter ${maxChapter} but ${existingMax} chapters already exist for this manhwa — likely a parsing failure, skipped this result.`,
            durationMs: Date.now() - startMs,
          };
        } else {
          const newChapters = chapters.filter(
            (c: any) => !existingNums.has(c.chapterNum)
          );

          let insertedCount = 0;
          if (newChapters.length > 0) {
            const chaptersToInsert = newChapters.map((chapter: any) => ({
              manhwaId: source.manhwaId,
              sourceId: source.sourceId,
              chapterNum: chapter.chapterNum,
              title: chapter.title,
              url: chapter.url,
              publishedAt: chapter.publishedAt ?? null,
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
            status: "success",
            chaptersFound: chapters.length,
            newChapters: insertedCount,
            reason: null,
            durationMs: Date.now() - startMs,
          };

          if (!winnerSourceId && maxChapter > existingMax) {
            winnerSourceId = source.sourceId;
          }
        }
      }
    } catch (err) {
      const isBlocked =
        err instanceof Error && err.name === "CloudflareBlockedError";
      outcome = {
        manhwaId: source.manhwaId,
        sourceUrl: source.url,
        manhwaTitle: source.manhwaTitle,
        status: isBlocked ? "blocked" : "error",
        chaptersFound: 0,
        newChapters: 0,
        reason: describeSourceError(err),
        durationMs: Date.now() - startMs,
      };
    }

    const durationLabel =
      outcome.durationMs >= 1000 ? `${(outcome.durationMs / 1000).toFixed(2)}s` : `${outcome.durationMs}ms`;

    // Append this source's result to the same growing tree — a manhwa with
    // multiple sources gets one continuous block, not several restarted
    // ones, so the final "└─" always lands on the true last line regardless
    // of how many sources it has.
    lines.push(`Source: ${humanizeSourceName(outcome.sourceUrl)}`);
    if (outcome.status === "success") {
      if (outcome.newChapters > 0) {
        lines.push(`Found: ${outcome.chaptersFound}`);
        lines.push(`New: +${outcome.newChapters}`);
        lines.push("Status: ✓ New chapters");
      } else {
        lines.push("Status: ✓ No new chapters");
      }
    } else if (outcome.status === "blocked") {
      lines.push("Status: ✗ Blocked");
      if (outcome.reason) lines.push(`Reason: ${outcome.reason}`);
    } else {
      // "error" — the regression guard specifically rejects a bad result
      // rather than just failing to fetch one, so it gets its own Action
      // line to make that distinction visible.
      const isRegressionRejection = outcome.reason?.includes("likely a parsing failure") ?? false;
      lines.push(`Status: ✗ ${isRegressionRejection ? "Parsing issue" : "Issue"}`);
      if (outcome.reason) lines.push(`Reason: ${outcome.reason}`);
      if (isRegressionRejection) lines.push("Action: Result rejected");
    }
    lines.push(`Time: ${durationLabel}`);

    const rowStatus: SyncSourceRow["status"] =
      outcome.status === "blocked"
        ? "failed"
        : outcome.status === "error"
          ? "issue"
          : outcome.newChapters > 0
            ? "new"
            : "no_new";

    result.rows.push({
      source: humanizeSourceName(outcome.sourceUrl),
      manhwaId: outcome.manhwaId,
      manhwaTitle: outcome.manhwaTitle,
      chapterFound: outcome.status === "success" ? outcome.chaptersFound : null,
      status: rowStatus,
      reason: outcome.reason || null,
      durationMs: outcome.durationMs,
    });

    if (
      outcome.status === "success" &&
      outcome.chaptersFound > 0 &&
      Math.max(0, existingMax) <= outcome.chaptersFound
    ) {
      break;
    }
  }

  console.log(renderTreeBlock(header, lines));

  if (winnerSourceId) {
    await repo.promoteLeadingSource(manhwaId, winnerSourceId);
  }
}

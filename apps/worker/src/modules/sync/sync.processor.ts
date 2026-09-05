import { SyncRepository } from "@manhwa-tracker/database";
import type { SyncResult, SyncSourceRow } from "@manhwa-tracker/shared";
import { getAdapter } from "@manhwa-tracker/parser";
import {
  type SourceOutcome,
  humanizeSourceName,
  describeSourceError,
  logSourceOutcome,
} from "./sync.utils";

export async function processManhwaSources(
  manhwaId: number,
  sources: any[],
  repo: SyncRepository,
  result: SyncResult,
  updatedManhwaIds: Set<number>
): Promise<void> {
  const manhwaTitle = sources[0].manhwaTitle;
  let winnerSourceId: number | null = null;

  try {
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

      if (
        Date.now() < nextExpectedTime &&
        Date.now() < lastReleaseTime + medianIntervalMs * 2
      ) {
        result.skippedSchedule += sources.length;
        console.log(
          `[sync] Skipping ${manhwaTitle} — not due yet (next expected in ${Math.round((nextExpectedTime - Date.now()) / (1000 * 60 * 60 * 24))} days)`
        );
        return;
      }
    }
  } catch (cadenceErr: any) {
    console.warn(
      `[sync] Cadence check failed for ${manhwaTitle}, syncing anyway:`,
      cadenceErr?.message ?? cadenceErr
    );
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

    logSourceOutcome(outcome);

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

  if (winnerSourceId) {
    await repo.promoteLeadingSource(manhwaId, winnerSourceId);
  }
}

import { SyncRepository } from "@manhwa-tracker/database";
import type { SyncResult, SyncSourceRow } from "@manhwa-tracker/shared";
import { getAdapter } from "@manhwa-tracker/parser";
import { type SourceOutcome, humanizeSourceName, describeSourceError, formatDuration } from "./sync.utils";

export async function processSingleSource(
  source: any,
  existingMax: number,
  existingNums: Set<number>,
  repo: SyncRepository,
  result: SyncResult,
  updatedManhwaIds: Set<number>,
  lines: string[]
): Promise<{ outcome: SourceOutcome; isWinner: boolean }> {
  let outcome: SourceOutcome;
  const startMs = Date.now();
  let isWinner = false;

  try {
    const { isSafeUrl } = await import("@manhwa-tracker/parser");
    if (!isSafeUrl(source.url)) {
      throw new Error(`SSRF Prevention: URL rejected (${source.url})`);
    }
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
        maxChapterNum: 0,
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
          maxChapterNum: maxChapter,
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
          maxChapterNum: maxChapter,
          newChapters: insertedCount,
          reason: null,
          durationMs: Date.now() - startMs,
        };

        if (maxChapter > existingMax) {
          isWinner = true;
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
      maxChapterNum: 0,
      newChapters: 0,
      reason: describeSourceError(err),
      durationMs: Date.now() - startMs,
    };
  }

  const durationLabel = formatDuration(outcome.durationMs);

  lines.push(`Source: ${humanizeSourceName(outcome.sourceUrl)}`);
  if (outcome.status === "success") {
    if (outcome.newChapters > 0) {
      lines.push(`Found: ${outcome.chaptersFound}`);
      lines.push(`New: +${outcome.newChapters}`);
      lines.push(`Status: ✓ New chapters (${durationLabel})`);
    } else {
      lines.push(`Status: ✓ No new chapters (${durationLabel})`);
    }
  } else if (outcome.status === "blocked") {
    lines.push(`Status: ✗ Blocked (${durationLabel})`);
    if (outcome.reason) lines.push(`Reason: ${outcome.reason}`);
  } else {
    const isRegressionRejection = outcome.reason?.includes("likely a parsing failure") ?? false;
    lines.push(`Status: ✗ ${isRegressionRejection ? "Parsing issue" : "Issue"} (${durationLabel})`);
    if (outcome.reason) lines.push(`Reason: ${outcome.reason}`);
    if (isRegressionRejection) lines.push("Action: Result rejected");
  }

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

  return { outcome, isWinner };
}

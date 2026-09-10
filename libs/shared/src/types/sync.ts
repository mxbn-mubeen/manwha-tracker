export type SyncScope = 'telegram' | 'websites' | 'all';

export type SyncSourceRow = {
  source: string;          // humanized hostname, e.g. "Asura Scans"
  manhwaId: number;        // for linking to the manhwa page from history
  manhwaTitle: string;     // e.g. "Solo Leveling"
  chapterFound: number | null; // null when failed/issue
  status: 'new' | 'no_new' | 'issue' | 'failed' | 'skipped';
  reason: string | null;   // detail for issue/failed rows
  durationMs?: number;     // latency in milliseconds
};

export interface SyncResult {
  scannedSources: number;
  newChapters: number;
  updatedManhwa: number;
  skippedTelegram: number;
  skippedSchedule: number;
  /** Distinct manhwa actually iterated this run — distinct from
   *  scannedSources, which counts total registered sources (a manhwa with
   *  2 sources counts once here, twice there). In-memory only, for the
   *  terminal summary — not persisted to sync_runs. */
  manhwaChecked: number;
  /** How many manhwa were classified as having an irregular release
   *  pattern this run (see cadence.ts's MAD-based check). In-memory only. */
  irregularCount: number;
  /** How many manhwa hit the 3x-overdue forced-check override this run.
   *  In-memory only. */
  overdueCount: number;
  errors: string[];
  duration: number;
  triggeredBy: string;
  rows: SyncSourceRow[];   // per-source breakdown for history UI
}

export type SyncRun = SyncResult & { runAt: Date };

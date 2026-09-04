export type SyncScope = 'telegram' | 'websites' | 'all';

export type SyncSourceRow = {
  source: string;          // humanized hostname, e.g. "Asura Scans"
  manhwaId: number;        // for linking to the manhwa page from history
  manhwaTitle: string;     // e.g. "Solo Leveling"
  chapterFound: number | null; // null when failed/issue
  status: 'new' | 'no_new' | 'issue' | 'failed';
  reason: string | null;   // detail for issue/failed rows
  durationMs?: number;     // latency in milliseconds
};

export interface SyncResult {
  scannedSources: number;
  newChapters: number;
  updatedManhwa: number;
  skippedTelegram: number;
  skippedSchedule: number;
  errors: string[];
  duration: number;
  triggeredBy: string;
  rows: SyncSourceRow[];   // per-source breakdown for history UI
}

export type SyncRun = SyncResult & { runAt: Date };

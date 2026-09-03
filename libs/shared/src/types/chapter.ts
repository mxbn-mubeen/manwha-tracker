export interface Chapter {
  id: number;
  manhwaId: number;
  sourceId: number;
  chapterNum: number;
  title: string | null;
  url: string | null;
  publishedAt: Date | null;
  discoveredAt: Date;
}

export interface ChapterInfo {
  chapterNum: number;
  title: string | null;
  url: string | null;
  publishedAt: Date | null;
}

export type InsertChapter = Omit<Chapter, 'id' | 'discoveredAt'>;

/**
 * Every intermediate stage of website chapter extraction (libs/parser's
 * chapter-extract.ts), not just the final result. Defined here rather than
 * in libs/parser so both libs/parser (which produces it) and
 * WebsiteAdapter.debugChapterList's signature (in adapter.ts, this same
 * package) can reference it without libs/shared depending on libs/parser —
 * libs/shared is meant to stay a dependency-free leaf package.
 */
export interface ChapterExtractDebugInfo {
  slug: string | null;
  usedSlugScopedScan: boolean;
  rawFoundNums: number[]; // every chapter number found by the <a>-tag scan, before any filtering
  afterOutlierTrim: number[];
  declaredCount: number | null;
  finalNums: number[];
  found: Map<number, ChapterInfo>;
}

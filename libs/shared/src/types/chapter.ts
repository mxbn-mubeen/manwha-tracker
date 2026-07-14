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

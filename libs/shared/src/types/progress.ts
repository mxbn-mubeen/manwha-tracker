export interface Progress {
  id: number;
  manhwaId: number;
  chapterId: number | null;
  lastReadAt: Date;
  isCompleted: boolean;
}

export type InsertProgress = Omit<Progress, 'id'>;

export interface ReadingProgressUpdate {
  manhwaId: number;
  chapterNum: number;
  chapterId?: number;
}

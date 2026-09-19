export type ManhwaStatus = 'ongoing' | 'completed' | 'hiatus' | 'dropped';

export interface CadenceInfo {
  insufficientData: boolean;
  isIrregular: boolean;
  isOverdue: boolean;
  nextExpectedTime: number | null;
  lastPublishedAt: string | null;
}

export interface Manhwa {
  id: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  status: ManhwaStatus;
  genres: string[];
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  cadenceInfo?: CadenceInfo | null;
}

export interface ManhwaWithProgress extends Manhwa {
  lastReadChapter: number | null;
  lastReadAt: Date | null;
  latestChapter: number | null;
  hasNewChapter: boolean;
}

export type InsertManhwa = Omit<Manhwa, 'id' | 'createdAt' | 'updatedAt'>;

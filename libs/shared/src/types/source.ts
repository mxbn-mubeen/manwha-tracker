export type SourceType = 'telegram' | 'website';

export interface Source {
  id: number;
  manhwaId: number;
  type: SourceType;
  url: string;
  adapterKey: string; // e.g. 'mangadex', 'manhuaus', 'telegram'
  priority: number;   // lower = higher priority
  isActive: boolean;
  createdAt: Date;
}

export type InsertSource = Omit<Source, 'id' | 'createdAt'>;

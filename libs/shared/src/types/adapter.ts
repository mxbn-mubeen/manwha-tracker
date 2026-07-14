import type { ChapterInfo } from './chapter';

/**
 * Common interface all website adapters must implement.
 * Add new adapters by implementing this interface — never modify callers.
 */
export interface WebsiteAdapter {
  /** Unique key identifying this adapter, e.g. 'mangadex', 'manhuaus' */
  readonly key: string;
  /** Human-readable name, e.g. 'MangaDex' */
  readonly name: string;
  /** URL patterns this adapter can handle */
  readonly urlPatterns: RegExp[];

  /** Extract the manhwa title from a given URL */
  detectTitle(url: string): Promise<string | null>;
  /** Fetch only the latest chapter info */
  latestChapter(manhwaUrl: string): Promise<ChapterInfo | null>;
  /** Fetch full chapter list (may be paginated internally) */
  chapterList(manhwaUrl: string): Promise<ChapterInfo[]>;
}

import type { ChapterInfo, ChapterExtractDebugInfo } from './chapter';

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
  /**
   * Site-specific strategy: return the chapter number this site considers
   * "current latest" from already-fetched HTML, or null to fall through to
   * the shared pipeline's generic heuristic (declared-count stat → DOM-order).
   *
   * Required on every adapter so adding a new site forces thinking about
   * how that specific site communicates its chapter count — rather than
   * silently relying on a shared heuristic that may produce wrong results
   * for sites with CTAs, early-access widgets, or unusual stat formats.
   */
  extractLatestChapterNum(html: string, url: string): number | null;
  /**
   * Site-specific strategy: determine if a chapter link represents a
   * locked/paywalled chapter that should be skipped.
   * @param outerHtml The full HTML string of the link element (e.g., <a href="..." data-coin="true">...</a>)
   * @param text The plain text content of the link
   */
  isChapterLocked?(outerHtml: string, text: string): boolean;
  /**

   * Same fetch as chapterList(), but returns every intermediate stage of
   * extraction for diagnostics. Called only when the regression guard fires
   * in sync.website.ts — not used in the normal sync path.
   */
  debugChapterList?(manhwaUrl: string): Promise<ChapterExtractDebugInfo>;
}

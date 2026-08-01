import { SyncRepository } from './sync.repository';

export type SyncScope = 'telegram' | 'websites' | 'all';

export interface SyncResult {
  scannedSources: number;
  newChapters: number;
  updatedManhwa: number;
  skippedTelegram: number;
  errors: string[];
  duration: number;
}

/**
 * Per-source sync failures come straight from the site adapter (fetch/cheerio) —
 * `result.errors[0]` is shown verbatim in the navbar Sync button's toast
 * (see AppShell.tsx), so a raw "Cannot read properties of null (reading
 * 'textContent')" or an axios stack should never end up in there.
 */
function describeSourceError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (/timed? ?out|ETIMEDOUT/i.test(message)) return 'Site took too long to respond.';
  if (/ENOTFOUND|ECONNREFUSED|fetch failed/i.test(message)) return 'Could not reach the site.';
  if (/403|forbidden/i.test(message)) return 'Site blocked the request (403).';
  if (/404|not found/i.test(message)) return 'Page no longer exists (404).';
  if (/cannot read propert|undefined is not|null is not/i.test(message)) {
    return "Site layout changed — couldn't find chapters.";
  }

  // Unknown shape — still useful to know *something* broke, but don't forward
  // raw stack/driver text into a toast description.
  return 'Failed to check for updates.';
}

export class SyncService {
  private repo: SyncRepository;

  constructor() {
    this.repo = new SyncRepository();
  }

  async run(scope: SyncScope = 'all'): Promise<SyncResult> {
    const start = Date.now();
    const result: SyncResult = {
      scannedSources: 0,
      newChapters: 0,
      updatedManhwa: 0,
      skippedTelegram: 0,
      errors: [],
      duration: 0,
    };

    const includeWebsites = scope === 'websites' || scope === 'all';
    const includeTelegram = scope === 'telegram' || scope === 'all';

    if (includeTelegram) {
      const telegramSources = await this.repo.getActiveSources('telegram');
      result.skippedTelegram = telegramSources.length;
      // Note: Telegram sources are skipped during manual sync because they are handled
      // by the background watcher process (watch:telegram).
    }

    if (includeWebsites) {
      // Lazy import: parser pulls in cheerio, no need to load it for telegram-only runs
      const { getAdapter } = await import('@manhwa-tracker/parser');
      const webSources = await this.repo.getActiveSources('website');
      result.scannedSources = webSources.length;

      const updatedManhwaIds = new Set<number>();

      for (const source of webSources) {
        try {
          const adapter = getAdapter(source.adapterKey, source.url);
          const chapters = await adapter.chapterList(source.url);
          if (chapters.length === 0) {
            console.warn(`[sync] source returned 0 chapters (possible block/interstitial): ${source.manhwaTitle} (${source.url})`);
            result.errors.push(`${source.manhwaTitle}: Got a response but found no chapters — site may be blocking the request.`);
            continue;
          }

          const existingNums = await this.repo.getExistingChapterNums(source.manhwaId);
          const newChapters = chapters.filter(c => !existingNums.has(c.chapterNum));

          if (newChapters.length === 0) continue;

          const chaptersToInsert = newChapters.map(chapter => ({
            manhwaId: source.manhwaId,
            sourceId: source.sourceId,
            chapterNum: chapter.chapterNum,
            title: chapter.title,
            url: chapter.url,
          }));

          const insertedCount = await this.repo.insertChaptersBulk(chaptersToInsert);

          if (insertedCount > 0) {
            result.newChapters += insertedCount;
            if (!updatedManhwaIds.has(source.manhwaId)) {
              updatedManhwaIds.add(source.manhwaId);
              await this.repo.touchManhwaUpdatedAt(source.manhwaId);
            }
          }
        } catch (err) {
          console.error(`[sync] source failed: ${source.manhwaTitle} (${source.url})`, err);
          result.errors.push(`${source.manhwaTitle}: ${describeSourceError(err)}`);
        }
      }

      result.updatedManhwa = updatedManhwaIds.size;
    }

    result.duration = Date.now() - start;
    return result;
  }
}
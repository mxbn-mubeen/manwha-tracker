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
          if (chapters.length === 0) continue;

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
          const message = err instanceof Error ? err.message : String(err);
          result.errors.push(`${source.manhwaTitle}: ${message}`);
        }
      }

      result.updatedManhwa = updatedManhwaIds.size;
    }

    result.duration = Date.now() - start;
    return result;
  }
}

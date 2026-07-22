import { ManhwaRepository } from './manhwa.repository';
import { ProgressRepository } from './progress.repository';
import { SourcesRepository } from './sources.repository';

export class ManhwaService {
  private repo: ManhwaRepository;
  private progressRepo: ProgressRepository;
  private sourcesRepo: SourcesRepository;

  constructor() {
    this.repo = new ManhwaRepository();
    this.progressRepo = new ProgressRepository();
    this.sourcesRepo = new SourcesRepository();
  }

  async addFromUrl(url: string) {
    const { parseMetadataFromUrl, detectAdapterKey } = await import('@manhwa-tracker/parser');
    const metadata = await parseMetadataFromUrl(url);
    const adapterKey = detectAdapterKey(url);

    return await this.sourcesRepo.createWithSource({
      title: metadata.title,
      slug: metadata.slug,
      coverUrl: metadata.coverUrl,
      description: metadata.description,
      sourceUrl: metadata.sourceUrl ?? url,
      adapterKey,
    });
  }

  /**
   * Manually create a manhwa entry (no source required).
   * Chapters and progress are created based on provided chapter numbers.
   * If no coverUrl is supplied, makes one best-effort attempt to find one
   * via MangaDex before falling back to no cover — never blocks or fails
   * creation if that lookup comes up empty.
   */
  async create(data: {
    title: string;
    coverUrl?: string;
    description?: string;
    genres?: string[];
    status?: string;
    lastChapter?: number;
    latestChapter?: number;
  }) {
    let coverUrl = data.coverUrl;
    if (!coverUrl) {
      try {
        const { lookupCoverUrl } = await import('@manhwa-tracker/parser');
        coverUrl = (await lookupCoverUrl(data.title)) ?? undefined;
      } catch (err) {
        console.warn(`[manhwa.service] Failed to lookup cover URL for "${data.title}":`, err);
      }
    }
    return await this.repo.createManual({ ...data, coverUrl });
  }

  async update(id: number, data: { title?: string; coverUrl?: string; description?: string; genres?: string[] }) {
    return await this.repo.update(id, data);
  }

  async updateStatus(id: number, status: 'ongoing' | 'completed' | 'hiatus' | 'dropped') {
    return await this.repo.updateStatus(id, status);
  }

  async getAll() {
    return await this.repo.getAll();
  }

  async getById(id: number) {
    return await this.repo.getById(id);
  }

  async updateProgress(manhwaId: number, chapter: number) {
    return await this.progressRepo.updateProgress(manhwaId, chapter);
  }

  async delete(id: number) {
    return await this.repo.deleteById(id);
  }

  async addSource(manhwaId: number, url: string, type: 'telegram' | 'website') {
    return await this.sourcesRepo.addSource(manhwaId, url, type);
  }

  async removeSource(manhwaId: number, url: string) {
    return await this.sourcesRepo.removeSource(manhwaId, url);
  }

  async getTelegramCount() {
    return await this.sourcesRepo.getTelegramCount();
  }
}


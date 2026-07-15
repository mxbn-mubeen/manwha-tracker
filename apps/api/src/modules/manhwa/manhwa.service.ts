import { ManhwaRepository } from './manhwa.repository';

export class ManhwaService {
  private repo: ManhwaRepository;

  constructor() {
    this.repo = new ManhwaRepository();
  }

  async addFromUrl(url: string) {
    const { parseMetadataFromUrl } = await import('@manhwa-tracker/parser');
    const metadata = await parseMetadataFromUrl(url);

    let adapterKey = 'generic';
    if (url.includes('asuracomic') || url.includes('asurascans')) adapterKey = 'asura';
    if (url.includes('webtoons.com')) adapterKey = 'webtoon';
    if (url.includes('reaperscans.com')) adapterKey = 'reaper';
    if (url.includes('manhuaus.com')) adapterKey = 'manhuaus';

    return await this.repo.createWithSource({
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
    return await this.repo.createManual(data);
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
    return await this.repo.updateProgress(manhwaId, chapter);
  }

  async delete(id: number) {
    return await this.repo.deleteById(id);
  }

  async addSource(manhwaId: number, url: string, type: 'telegram' | 'website') {
    return await this.repo.addSource(manhwaId, url, type);
  }
}

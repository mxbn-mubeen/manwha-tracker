import { parseMetadataFromUrl } from '@manhwa-tracker/parser';
import { ManhwaRepository } from './manhwa.repository';

export class ManhwaService {
  private repo: ManhwaRepository;

  constructor() {
    this.repo = new ManhwaRepository();
  }

  async addFromUrl(url: string) {
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
      sourceUrl: metadata.sourceUrl,
      adapterKey,
    });
  }

  async getAll() {
    return await this.repo.getAll();
  }
}

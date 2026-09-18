import { describe, it, expect } from 'vitest';
import { search } from './search';

interface Manhwa {
  id: number;
  title: string;
  genres: string[];
}

const LIBRARY: Manhwa[] = [
  { id: 344, title: 'The S-Classes That I Raised',    genres: ['Action', 'Fantasy'] },
  { id: 1,   title: 'Solo Leveling',                  genres: ['Action', 'Fantasy'] },
  { id: 2,   title: 'Solo Leveling: Ragnarok',        genres: ['Action', 'Fantasy'] },
  { id: 3,   title: 'The Beginning After the End',    genres: ['Action', 'Fantasy', 'Isekai'] },
  { id: 4,   title: 'Omniscient Reader',              genres: ['Action', 'Sci-Fi'] },
  { id: 5,   title: 'Eleceed',                        genres: ['Action', 'Comedy'] },
  { id: 6,   title: 'Dragon Raja',                    genres: ['RPG', 'Fantasy'] },
  { id: 7,   title: 'Completely Unrelated Title',     genres: ['Slice of Life'] },
];

const TITLE_ONLY = [
  { key: 'title' as const, weight: 1 },
];

describe('ranking order', () => {
  it('exact title > starts-with > token/fuzzy', () => {
    const r = search(LIBRARY, 'solo leveling', { fields: TITLE_ONLY });
    const exactIdx  = r.findIndex(m => m.title === 'Solo Leveling');
    const ragnarokIdx = r.findIndex(m => m.title === 'Solo Leveling: Ragnarok');
    // Both should appear; exact comes first
    expect(exactIdx).toBeGreaterThanOrEqual(0);
    expect(ragnarokIdx).toBeGreaterThanOrEqual(0);
    expect(exactIdx).toBeLessThan(ragnarokIdx);
  });
});

describe('limit option', () => {
  it('returns at most limit results', () => {
    const r = search(LIBRARY, 'a', { fields: TITLE_ONLY, limit: 3 });
    expect(r.length).toBeLessThanOrEqual(3);
  });

  it('empty query returns empty array regardless of limit', () => {
    const r = search(LIBRARY, '', { fields: TITLE_ONLY, limit: 8 });
    expect(r).toHaveLength(0);
  });

  it('whitespace-only query returns empty array', () => {
    const r = search(LIBRARY, '   ', { fields: TITLE_ONLY });
    expect(r).toHaveLength(0);
  });
});

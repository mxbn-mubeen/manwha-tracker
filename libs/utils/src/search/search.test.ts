import { describe, it, expect } from 'vitest';
import { search } from './search';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

const TITLE_ID = [
  { key: 'title' as const, weight: 1 },
  { key: 'id'    as const, weight: 0.7 },
];

const TITLE_GENRES = [
  { key: 'title'  as const, weight: 1 },
  { key: 'genres' as const, weight: 0.4, isArray: true },
];

// ---------------------------------------------------------------------------
// Normalize / case insensitivity
// ---------------------------------------------------------------------------

describe('case insensitivity', () => {
  it('lowercase query matches mixed-case title', () => {
    const r = search(LIBRARY, 'solo leveling', { fields: TITLE_ONLY });
    expect(r.map(m => m.title)).toContain('Solo Leveling');
  });

  it('uppercase query matches title', () => {
    const r = search(LIBRARY, 'SOLO LEVELING', { fields: TITLE_ONLY });
    expect(r.map(m => m.title)).toContain('Solo Leveling');
  });
});

// ---------------------------------------------------------------------------
// Exact & prefix matching
// ---------------------------------------------------------------------------

describe('exact and prefix matching', () => {
  it('exact title match returns correct result', () => {
    const r = search(LIBRARY, 'Solo Leveling', { fields: TITLE_ONLY });
    expect(r[0]?.title).toBe('Solo Leveling');
  });

  it('prefix "solo lev" matches Solo Leveling', () => {
    const r = search(LIBRARY, 'solo lev', { fields: TITLE_ONLY });
    expect(r.map(m => m.title)).toContain('Solo Leveling');
  });
});

// ---------------------------------------------------------------------------
// Token matching (multi-word, non-contiguous)
// ---------------------------------------------------------------------------

describe('token matching', () => {
  it('"s class raised" matches The S-Classes That I Raised', () => {
    const r = search(LIBRARY, 's class raised', { fields: TITLE_ONLY });
    expect(r.map(m => m.title)).toContain('The S-Classes That I Raised');
  });

  it('"s classes" matches The S-Classes That I Raised', () => {
    const r = search(LIBRARY, 's classes', { fields: TITLE_ONLY });
    expect(r.map(m => m.title)).toContain('The S-Classes That I Raised');
  });

  it('"classes raised" matches The S-Classes That I Raised', () => {
    const r = search(LIBRARY, 'classes raised', { fields: TITLE_ONLY });
    expect(r.map(m => m.title)).toContain('The S-Classes That I Raised');
  });

  it('"beginning after end" matches The Beginning After the End', () => {
    const r = search(LIBRARY, 'beginning after end', { fields: TITLE_ONLY });
    expect(r.map(m => m.title)).toContain('The Beginning After the End');
  });
});

// ---------------------------------------------------------------------------
// Fuzzy matching (typos)
// ---------------------------------------------------------------------------

describe('fuzzy matching', () => {
  it('"solo levling" (typo) matches Solo Leveling', () => {
    const r = search(LIBRARY, 'solo levling', { fields: TITLE_ONLY });
    expect(r.map(m => m.title)).toContain('Solo Leveling');
  });

  it('"omnisciant" (typo) matches Omniscient Reader', () => {
    const r = search(LIBRARY, 'omnisciant reader', { fields: TITLE_ONLY });
    expect(r.map(m => m.title)).toContain('Omniscient Reader');
  });
});

// ---------------------------------------------------------------------------
// Negative cases
// ---------------------------------------------------------------------------

describe('negative cases', () => {
  it('"zzzzunknown" returns no results', () => {
    const r = search(LIBRARY, 'zzzzunknown', { fields: TITLE_ONLY });
    expect(r).toHaveLength(0);
  });

  it('"completely unrelated query xyz" does not match real titles', () => {
    const r = search(LIBRARY, 'completely unrelated query xyz', { fields: TITLE_ONLY });
    // The title "Completely Unrelated Title" shares tokens so may match — that
    // is correct behaviour. What must not happen: unrelated titles matching.
    for (const m of r) {
      expect(m.title).toBe('Completely Unrelated Title');
    }
  });

  it('"dragon" does not match Solo Leveling', () => {
    const r = search(LIBRARY, 'dragon', { fields: TITLE_ONLY });
    expect(r.map(m => m.title)).not.toContain('Solo Leveling');
  });
});

// ---------------------------------------------------------------------------
// Genre field (weighted)
// ---------------------------------------------------------------------------

describe('genre search', () => {
  it('"action" matches Action genre titles', () => {
    const r = search(LIBRARY, 'action', { fields: TITLE_GENRES });
    const actionIds = LIBRARY.filter(m => m.genres.includes('Action')).map(m => m.id);
    const resultIds = r.map(m => m.id);
    // Every Action title should appear in results
    for (const id of actionIds) {
      expect(resultIds).toContain(id);
    }
  });

  it('"fantasy" matches Fantasy genre titles', () => {
    const r = search(LIBRARY, 'fantasy', { fields: TITLE_GENRES });
    expect(r.map(m => m.title)).toContain('Solo Leveling');
  });

  it('exact title match outranks genre match in ranking', () => {
    // "Solo Leveling" is an exact title match; "Eleceed" only matches via Action genre.
    const r = search(LIBRARY, 'Solo Leveling', { fields: TITLE_GENRES });
    const soloIdx = r.findIndex(m => m.title === 'Solo Leveling');
    const eleceedIdx = r.findIndex(m => m.title === 'Eleceed');
    expect(soloIdx).toBeGreaterThanOrEqual(0);
    if (eleceedIdx >= 0) {
      expect(soloIdx).toBeLessThan(eleceedIdx);
    }
  });
});

// ---------------------------------------------------------------------------
// UID / numeric field search
// ---------------------------------------------------------------------------

describe('UID search', () => {
  it('exact UID "344" returns The S-Classes That I Raised at top', () => {
    const r = search(LIBRARY, '344', { fields: TITLE_ID });
    expect(r[0]?.id).toBe(344);
  });

  it('UID prefix "34" matches id=344', () => {
    const r = search(LIBRARY, '34', { fields: TITLE_ID });
    expect(r.map(m => m.id)).toContain(344);
  });

  it('exact UID match outranks fuzzy title match', () => {
    const r = search(LIBRARY, '344', { fields: TITLE_ID });
    // id=344 (S-Classes) must appear before any title-fuzzy match
    expect(r[0]?.id).toBe(344);
  });

  it('title query "solo" does not incorrectly surface numeric-only match', () => {
    const r = search(LIBRARY, 'solo', { fields: TITLE_ID });
    expect(r.map(m => m.title)).toContain('Solo Leveling');
    // id=1 would only be "numeric match" on "solo" — which is not a number
    // so numeric scoring returns 0. Solo Leveling should be top.
    expect(r[0]?.title).toContain('Solo Leveling');
  });
});

// ---------------------------------------------------------------------------
// Ranking order
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Limit
// ---------------------------------------------------------------------------

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

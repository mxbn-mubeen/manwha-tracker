export const SOURCE_TYPES = ['telegram', 'website'] as const;

export const MANHWA_STATUS = ['ongoing', 'completed', 'hiatus', 'dropped'] as const;

export const NOTIFICATION_TYPES = ['new_chapter', 'source_error', 'sync_complete'] as const;

export const ADAPTER_KEYS = [
  'mangadex',
  'webtoon',
  'asurascans',
  'reaperscans',
  'flamecomics',
  'manhuaus',
  'telegram',
] as const;

export type AdapterKey = typeof ADAPTER_KEYS[number];

export const SYNC_INTERVAL_MINUTES = 30;

export const DEFAULT_PRIORITY = 10;

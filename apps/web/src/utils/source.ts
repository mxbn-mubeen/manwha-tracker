/**
 * Detects whether a given input URL or handle is a Telegram source.
 * Matches:
 *  - `@channel_name`
 *  - `https://t.me/...`
 *  - `t.me/...`
 *  - `telegram.me/...`
 *  - `telegram.dog/...`
 *  - `tg://...`
 */
export function isTelegramUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith('@') ||
    trimmed.startsWith('tg://') ||
    trimmed.includes('t.me') ||
    trimmed.includes('telegram.me') ||
    trimmed.includes('telegram.dog')
  );
}


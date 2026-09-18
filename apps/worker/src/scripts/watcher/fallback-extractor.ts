/**
 * Some shows have a number baked into their own title/aliases (e.g. this
 * app tracks one literally titled "...3077" across every alias — not a
 * chapter count, just part of the name, the same way "86 Eighty-Six" or
 * "9-1-1" have numbers with nothing to do with episode counts). If an
 * uploader names their file after the show itself, the fallback matcher
 * below has no way to tell "a number from the title" apart from "the
 * actual chapter" — so strip any 2+-digit run that's part of the known
 * title before guessing. (2+ digits only, so a real single-digit early
 * chapter like "5" can't be accidentally swallowed by an incidental digit
 * somewhere in the title.)
 */
export function stripKnownTitleNumbers(text: string, title: string | undefined): string {
  if (!title) return text;
  const titleNumbers = title.match(/\d{2,}/g);
  if (!titleNumbers) return text;
  let result = text;
  for (const n of new Set(titleNumbers)) {
    // \b alone doesn't work here — underscore counts as a word character in
    // JS regex, so "_3077_" has no \b between "_" and "3". Match the same
    // set of delimiters extractFallbackChapter itself treats as boundaries.
    result = result.replace(new RegExp(`(?:^|\\b|_|-|#)${n}(?:\\b|_|-|\\.|$)`, 'g'), ' ');
  }
  return result;
}

export function extractFallbackChapter(text: string): number | null {
  const cleaned = text
    .replace(/\b(19\d\d|20\d\d)\b/g, '') // remove years
    .replace(/\b(720|1080|1440|2160|480|360)[pi]?\b/gi, '') // remove resolutions
    .replace(/\b\d+(?:\.\d+)?\s*(?:kb|mb|gb)\b/gi, '') // remove sizes (Telegram's own captions use "4074 KB", with a space)
    .replace(/\b(66666|10000|4000|100|99|1st|2nd|3rd|\d+th)\b/gi, ''); // remove common title numbers

  const matches = cleaned.match(/(?:^|\b|_|-|#)(\d+(?:\.\d+)?)(?:\b|_|-|\.|$)/g);
  if (!matches) return null;

  const lastMatch = matches[matches.length - 1];
  if (!lastMatch) return null;
  const numMatch = lastMatch.match(/\d+(?:\.\d+)?/);
  if (!numMatch) return null;

  const num = parseFloat(numMatch[0]);
  return Number.isNaN(num) ? null : num;
}

const TIME_UNIT_MS: Record<string, number> = {
  second: 1_000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 30 * 86_400_000,
  year: 365 * 86_400_000,
};

/**
 * Parse a publish-date string embedded in a chapter link's text content into
 * an absolute Date. Handles every format observed across the current adapters:
 *
 *  • Absolute date   — "July 15, 2026" / "Aug 8, 2026"   (Arenascans)
 *  • Named alias     — "yesterday", "last week"            (AsuraScans, generic)
 *  • "N unit ago"    — "5 days ago", "2 weeks ago"         (AsuraScans)
 *  • Compound        — "1 week, 4 days" / "2 months 1 week" (Mgeko, MGRead)
 *
 * Safe against false positives from chapter numbers ("Chapter 190", "215-eng-li")
 * because bare numbers with no time-unit word after them are never matched.
 *
 * Returns null if the text contains no recognisable date — the caller falls back
 * to discoveredAt in that case, which is intentional.
 */
export function parseRelativeTime(text: string): Date | null {
  const now = Date.now();
  const t = text.toLowerCase().trim();

  // ── Named aliases ────────────────────────────────────────────────────────
  if (t.includes('just now') || t.includes('moments ago')) return new Date(now);
  if (t.includes('yesterday')) return new Date(now - 86_400_000);
  if (t.includes('last week')) return new Date(now - 7 * 86_400_000);
  if (t.includes('last month')) return new Date(now - 30 * 86_400_000);

  // ── Absolute dates: "July 15, 2026" / "Aug 8, 2026" ────────────────────
  // Match the month name anywhere in the text so we pick it up even when
  // the chapter title appears in the same text node.
  const absMatch = text.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  );
  if (absMatch) {
    const d = new Date(`${absMatch[1]} ${absMatch[2]}, ${absMatch[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  // ── Relative times: "N unit [ago]" and compound "N unit, N unit" ────────
  // Scan for ALL (number + time-unit) pairs and sum their milliseconds.
  // This handles both "5 days ago" (single pair) and "1 week, 4 days" (two
  // pairs) with the same code path — no special-casing needed.
  // Chapter numbers like "190" or "215-eng-li" are never matched because
  // they have no time-unit word following them.
  const relRegex = /\b(\d+)\s*(second|minute|hour|day|week|month|year)s?\b/gi;
  let totalMs = 0;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = relRegex.exec(t)) !== null) {
    const n = parseInt(m[1] ?? "0", 10);
    const unit = (m[2] ?? "").toLowerCase();
    totalMs += n * (TIME_UNIT_MS[unit] ?? 0);
    matched = true;
  }
  if (matched) return new Date(now - totalMs);

  return null;
}

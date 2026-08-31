import { Star, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Source {
  latestChapterNum: number | null;
  lastDiscoveredAt: Date | string | null;
}

/** Returns a compact relative time string like "2 min ago", "just now", "3 days ago". */
export function timeAgo(dateRaw: Date | string | null): string {
  if (!dateRaw) return 'never';
  const date = typeof dateRaw === 'string' ? new Date(dateRaw) : dateRaw;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'just now';
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d !== 1 ? 's' : ''} ago`;
}

export type SourceStatus = 'leading' | 'synced' | 'behind' | 'unknown';

export function computeStatus(
  sourceChapter: number | null,
  globalMax: number,
  allSources: Source[],
): SourceStatus {
  if (sourceChapter === null) return 'unknown';
  const allKnown = allSources.filter(s => s.latestChapterNum !== null);
  const allSame = allKnown.length > 1 && allKnown.every(s => s.latestChapterNum === sourceChapter);
  if (allSame) return 'synced';
  if (sourceChapter >= globalMax) return 'leading';
  return 'behind';
}

/** Compact duration string: "2h", "3d", "45m" */
export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

interface StatusBadgeProps {
  status: SourceStatus;
  sourceChapter: number | null;
  globalMax: number;
  thisDiscoveredAt: Date | string | null;
  leaderDiscoveredAt: Date | string | null;
}

export function StatusBadge({ status, sourceChapter, globalMax, thisDiscoveredAt, leaderDiscoveredAt }: StatusBadgeProps) {
  if (status === 'unknown') {
    return <span className="text-xs text-muted-foreground/60">— No chapters synced yet</span>;
  }

  if (status === 'leading') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
        <Star className="h-3 w-3 fill-amber-400" />
        Leading source
      </span>
    );
  }

  if (status === 'synced') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Synced
      </span>
    );
  }

  const diff = globalMax - (sourceChapter ?? 0);
  let timeDiffLabel: string | null = null;
  if (leaderDiscoveredAt && thisDiscoveredAt) {
    const leaderMs = typeof leaderDiscoveredAt === 'string' ? new Date(leaderDiscoveredAt).getTime() : leaderDiscoveredAt.getTime();
    const thisMs = typeof thisDiscoveredAt === 'string' ? new Date(thisDiscoveredAt).getTime() : thisDiscoveredAt.getTime();
    const gapMs = thisMs - leaderMs;
    if (gapMs > 60_000) timeDiffLabel = `${formatDuration(gapMs)} slower`;
    else if (gapMs < -60_000) timeDiffLabel = `${formatDuration(-gapMs)} faster`;
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-orange-400/80">
      <span className="inline-flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Behind by {diff} chapter{diff !== 1 ? 's' : ''}
      </span>
      {timeDiffLabel && <span className="text-zinc-500">·</span>}
      {timeDiffLabel && <span className="text-zinc-400 font-normal">{timeDiffLabel} than leader</span>}
    </span>
  );
}

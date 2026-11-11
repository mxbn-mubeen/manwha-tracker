import { Star, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface Source {
  latestChapterNum: number | null;
  lastDiscoveredAt: Date | string | null;
}

/** Returns a compact relative time string like "2m ago", "just now", "3d ago". */
export function timeAgo(dateRaw: Date | string | null): string {
  if (!dateRaw) return 'never';
  const date = typeof dateRaw === 'string' ? new Date(dateRaw) : dateRaw;
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'just now';
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export type SourceStatus = 'leading' | 'synced' | 'behind' | 'unknown';

export function computeStatus(
  sourceChapter: number | null,
  globalMax: number,
  allSources: Source[],
): SourceStatus {
  if (sourceChapter === null) return 'unknown';
  const allKnown = allSources.filter((s) => s.latestChapterNum !== null);
  const allSame = allKnown.length > 1 && allKnown.every((s) => s.latestChapterNum === sourceChapter);
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

export function StatusBadge({
  status,
  sourceChapter,
  globalMax,
  thisDiscoveredAt,
  leaderDiscoveredAt,
}: StatusBadgeProps) {
  if (status === 'unknown') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 bg-white/5 border border-border/20 px-2.5 py-0.5 rounded-full">
        <Clock className="w-3 h-3 text-zinc-500" />
        <span>No chapters synced yet</span>
      </span>
    );
  }

  if (status === 'leading') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 rounded-full shadow-sm shadow-amber-500/10">
        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
        <span>Leading source</span>
      </span>
    );
  }

  if (status === 'synced') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-0.5 rounded-full shadow-sm shadow-emerald-500/10">
        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        <span>Synced with leader</span>
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
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-300 bg-orange-500/15 border border-orange-500/35 px-2.5 py-0.5 rounded-full">
      <AlertTriangle className="h-3 w-3 text-orange-400 shrink-0" />
      <span>Behind by {diff} ch</span>
      {timeDiffLabel && <span className="text-orange-400/60 font-normal">({timeDiffLabel})</span>}
    </span>
  );
}

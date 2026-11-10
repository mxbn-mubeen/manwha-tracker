import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, FastForward } from 'lucide-react';
import type { SyncSourceRow } from '@manhwa-tracker/shared';
import { getAdapterBadgeClass } from '@/features/sources/utils/adapterColors';

export const STATUS_CONFIG: Record<
  SyncSourceRow['status'],
  { icon: React.ReactNode; label: string; cls: string }
> = {
  new: {
    icon: <Sparkles className="h-3 w-3 text-emerald-400 shrink-0" />,
    label: '+ New Chapter',
    cls: 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 font-semibold shadow-sm',
  },
  no_new: {
    icon: <CheckCircle2 className="h-3 w-3 text-zinc-500 shrink-0" />,
    label: 'Up to date',
    cls: 'text-zinc-400 bg-white/[0.03] border border-border/20 font-normal',
  },
  issue: {
    icon: <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />,
    label: 'Issue',
    cls: 'text-amber-300 bg-amber-500/15 border border-amber-500/30 font-semibold',
  },
  failed: {
    icon: <XCircle className="h-3 w-3 text-red-400 shrink-0" />,
    label: 'Failed',
    cls: 'text-red-300 bg-red-500/15 border border-red-500/30 font-semibold',
  },
  skipped: {
    icon: <FastForward className="h-3 w-3 text-zinc-500 shrink-0" />,
    label: 'Skipped',
    cls: 'text-zinc-400 bg-white/[0.03] border border-border/20 font-normal',
  },
};

export function getSourceBadgeClass(source: string): string {
  const s = source.toLowerCase();
  if (s.includes('asura')) return getAdapterBadgeClass('asurascans');
  if (s.includes('reaper')) return getAdapterBadgeClass('reaperscans');
  if (s.includes('arena')) return getAdapterBadgeClass('arenascans');
  if (s.includes('thunder')) return getAdapterBadgeClass('thunderscans');
  if (s.includes('geko')) return getAdapterBadgeClass('mgeko');
  if (s.includes('read')) return getAdapterBadgeClass('mgread');
  if (s.includes('telegram') || s.startsWith('@')) return getAdapterBadgeClass('telegram');
  if (s.includes('webtoon')) return getAdapterBadgeClass('webtoon');
  if (s.includes('cadence')) return 'bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-mono text-[10px]';
  return getAdapterBadgeClass(s);
}

export function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

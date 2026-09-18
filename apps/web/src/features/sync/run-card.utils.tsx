import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, FastForward } from 'lucide-react';
import type { SyncSourceRow } from '@manhwa-tracker/shared';

export const STATUS_CONFIG: Record<SyncSourceRow['status'], { icon: React.ReactNode; label: string; cls: string }> = {
  new:    { icon: <Sparkles className="h-3.5 w-3.5" />,      label: '+ New chapter',    cls: 'text-emerald-400 bg-emerald-400/10' },
  no_new: { icon: <CheckCircle2 className="h-3.5 w-3.5" />,  label: '✓ No new chapter', cls: 'text-zinc-400 bg-zinc-400/10' },
  issue:  { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: '⚠ Issue',           cls: 'text-amber-400 bg-amber-400/10' },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />,       label: '✕ Failed',         cls: 'text-red-400 bg-red-400/10' },
  skipped: { icon: <FastForward className="h-3.5 w-3.5" />,  label: '⏭ Skipped',        cls: 'text-zinc-400 bg-zinc-400/10' },
};

export function formatRelative(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatDuration(ms: number): string {
  const totalSec = ms >= 1000 ? ms / 1000 : ms;
  if (totalSec < 1)   return `${Math.round(totalSec * 1000)}ms`;
  if (totalSec < 60)  return `${totalSec.toFixed(1)}s`;
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

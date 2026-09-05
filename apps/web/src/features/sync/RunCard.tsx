import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import type { SyncRun, SyncSourceRow } from '@manhwa-tracker/shared';

export const STATUS_CONFIG: Record<SyncSourceRow['status'], { icon: React.ReactNode; label: string; cls: string }> = {
  new:    { icon: <Sparkles className="h-3.5 w-3.5" />,      label: '+ New chapter',    cls: 'text-emerald-400 bg-emerald-400/10' },
  no_new: { icon: <CheckCircle2 className="h-3.5 w-3.5" />,  label: '✓ No new chapter', cls: 'text-zinc-400 bg-zinc-400/10' },
  issue:  { icon: <AlertTriangle className="h-3.5 w-3.5" />, label: '⚠ Issue',           cls: 'text-amber-400 bg-amber-400/10' },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />,       label: '✕ Failed',         cls: 'text-red-400 bg-red-400/10' },
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

export function RunCard({ run, onClose }: { run: SyncRun, onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'new' | 'issues' | 'errors'>('all');
  
  const newCount    = run.rows.filter((r: SyncSourceRow) => r.status === 'new').length;
  const issueCount  = run.rows.filter((r: SyncSourceRow) => r.status === 'issue' || r.status === 'failed').length;
  // Top-level errors — e.g. a whole manhwa group's processing throwing before
  // any per-source row could even be pushed — are distinct from per-row
  // issues/failures above and were previously written to the DB but never
  // shown anywhere in this UI, so a run could report "0 new, 0 issues" while
  // having failed entirely, with zero indication anything was wrong.
  const runErrors = run.errors ?? [];

  const filteredRows = run.rows.filter((r: SyncSourceRow) => {
    if (filter === 'new') return r.status === 'new';
    if (filter === 'issues') return r.status === 'issue' || r.status === 'failed';
    return true;
  });

  return (
    <div className="border border-border/30 rounded-xl overflow-hidden bg-[#111213]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          <span className="text-zinc-300 font-medium">{formatRelative(run.runAt)}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-500">{run.scannedSources} sources</span>
          {newCount > 0 && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="text-emerald-400 font-medium">{newCount} new</span>
            </>
          )}
          {issueCount > 0 && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="text-amber-400">{issueCount} issue{issueCount > 1 ? 's' : ''}</span>
            </>
          )}
          {run.skippedSchedule > 0 && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">Skipped {run.skippedSchedule} (schedule)</span>
            </>
          )}
          {runErrors.length > 0 && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="text-red-400 font-medium">{runErrors.length} error{runErrors.length > 1 ? 's' : ''}</span>
            </>
          )}
          {run.rows.length === 0 && runErrors.length === 0 && run.skippedSchedule === 0 && run.scannedSources > 0 && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="text-red-400 font-medium" title="scannedSources is set before processing starts — this usually means the run failed before reaching any source, but somehow left no error message either.">
                No sources actually processed
              </span>
            </>
          )}
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-600 capitalize">{run.triggeredBy}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-600">{formatDuration(run.duration)}</span>
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-zinc-600 shrink-0" />
          : <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" />
        }
      </button>

      {open && (
        <div className="border-t border-border/20">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/10 bg-[#161719]">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
              All ({run.rows.length})
            </button>
            <button 
              onClick={() => setFilter('new')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'new' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
            >
              New ({newCount})
            </button>
            <button 
              onClick={() => setFilter('issues')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'issues' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10'}`}
            >
              Issues ({issueCount})
            </button>
            {runErrors.length > 0 && (
              <button 
                onClick={() => setFilter('errors')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${filter === 'errors' ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'}`}
              >
                Errors ({runErrors.length})
              </button>
            )}
          </div>

          {filter === 'errors' ? (
            <div className="px-4 py-3 space-y-2">
              {runErrors.map((err: string, i: number) => (
                <div key={i} className="text-xs text-red-400/90 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 break-words">
                  {err}
                </div>
              ))}
            </div>
          ) : (
            <>
          <div className="hidden sm:grid grid-cols-[140px_minmax(0,1fr)_70px_50px_140px] gap-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 border-b border-border/10">
            <span>Source</span>
            <span>Manhwa</span>
            <span className="text-right">Ch.</span>
            <span className="text-right">Time</span>
            <span>Status</span>
          </div>
          {filteredRows.map((row: SyncSourceRow, i: number) => {
            const cfg = STATUS_CONFIG[row.status];
            return (
              <div
                key={i}
                className="flex flex-col gap-1.5 px-4 py-2.5 text-sm border-b border-border/10 last:border-0 hover:bg-white/[0.02] sm:grid sm:grid-cols-[140px_minmax(0,1fr)_70px_50px_140px] sm:gap-3 sm:items-start"
              >
                <div className="flex items-start justify-between gap-2 sm:hidden">
                  <span className="text-zinc-400 truncate min-w-0">{row.source}</span>
                  <span className="flex flex-col items-end shrink-0 gap-0.5">
                    <span className="text-zinc-400 font-mono text-xs">
                      {row.chapterFound != null ? `ch. ${row.chapterFound}` : '—'}
                    </span>
                    {row.durationMs != null && (
                      <span className="text-zinc-600 font-mono text-[10px]">
                        {formatDuration(row.durationMs)}
                      </span>
                    )}
                  </span>
                </div>
                <span className="hidden sm:block text-zinc-400 truncate min-w-0">{row.source}</span>
                {row.manhwaId ? (
                  <Link 
                    to={`/manhwa/${row.manhwaId}`} 
                    onClick={onClose}
                    className="text-zinc-300 hover:text-amber-300 transition-colors truncate min-w-0"
                  >
                    {row.manhwaTitle}
                  </Link>
                ) : (
                  <span className="text-zinc-300 truncate min-w-0">{row.manhwaTitle}</span>
                )}
                <span className="hidden sm:inline text-right text-zinc-400 font-mono">
                  {row.chapterFound != null ? row.chapterFound : '—'}
                </span>
                <span className="hidden sm:inline text-right text-zinc-500 font-mono text-xs">
                  {row.durationMs != null ? formatDuration(row.durationMs) : '—'}
                </span>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap w-fit ${cfg.cls}`}>
                    {cfg.icon}
                    {cfg.label}
                  </span>
                  {row.reason && (
                    <span className="text-[10px] text-zinc-600 pl-1 break-words">{row.reason}</span>
                  )}
                </div>
              </div>
            );
          })}
          
          {filteredRows.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No sources match this filter.
            </div>
          )}
          </>
          )}
        </div>
      )}
    </div>
  );
}
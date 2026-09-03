import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { trpc } from '@/lib/trpc';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import type { SyncRun, SyncSourceRow } from '@manhwa-tracker/shared';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// ─── Status helpers ────────────────────────────────────────────────────────────

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
  // Duration may arrive as seconds (worker stores it that way) or milliseconds.
  // Heuristic: if the value is < 300 and has decimals it's almost certainly
  // seconds already (a full sync takes 30–300 s, never < 1 ms as an integer).
  // Anything >= 1000 is treated as milliseconds and converted.
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

// ─── Single run row ────────────────────────────────────────────────────────────

export function RunCard({ run, onClose }: { run: SyncRun, onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'new' | 'issues'>('all');
  
  const newCount    = run.rows.filter((r: SyncSourceRow) => r.status === 'new').length;
  const issueCount  = run.rows.filter((r: SyncSourceRow) => r.status === 'issue' || r.status === 'failed').length;

  const filteredRows = run.rows.filter((r: SyncSourceRow) => {
    if (filter === 'new') return r.status === 'new';
    if (filter === 'issues') return r.status === 'issue' || r.status === 'failed';
    return true;
  });

  return (
    <div className="border border-border/30 rounded-xl overflow-hidden bg-[#111213]">
      {/* Run summary header */}
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

      {/* Per-source rows */}
      {open && (
        <div className="border-t border-border/20">
          {/* Tabs */}
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
          </div>

          {/* Table header - hidden on mobile, shown from sm up */}
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
                {/* Mobile-only: source + chapter on one line. Hidden from sm up, where
                    each becomes its own grid column instead — without sm:hidden here,
                    this duplicated the chapter number next to the dedicated Ch. column
                    at desktop widths, and `sm:contents` turned its two children into
                    extra grid items that didn't match the 4-column template, breaking
                    row alignment across the table. */}
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
        </div>
      )}
    </div>
  );
}

// ─── Main drawer ───────────────────────────────────────────────────────────────

interface SyncHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SyncHistoryDrawer({ open, onClose }: SyncHistoryDrawerProps) {
  const { data: history = [] } = trpc.sync.getHistory.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  return (
    <Sheet open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl bg-[#0d0e10] border-border/30 flex flex-col"
      >
        <SheetHeader className="pb-4 border-b border-border/20">
          <SheetTitle className="text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            Sync History
          </SheetTitle>
        </SheetHeader>

        <div 
          className="flex-1 overflow-y-auto py-4 pr-1 space-y-3 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-600 gap-2">
              <Clock className="h-8 w-8 opacity-30" />
              <p className="text-sm">No syncs yet this session.</p>
              <p className="text-xs opacity-60">Run a sync to see results here.</p>
            </div>
          ) : (
            history.map((run, i) => <RunCard key={i} run={run as SyncRun} onClose={onClose} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
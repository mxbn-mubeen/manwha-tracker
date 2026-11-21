import { Clock, ChevronDown, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';
import type { SyncRun } from '@manhwa-tracker/shared';
import { formatRelative, formatDuration } from '../../run-card.utils';

interface RunCardHeaderProps {
  run: SyncRun;
  open: boolean;
  onToggle: () => void;
  newCount: number;
  issueCount: number;
  errorCount: number;
}

export function RunCardHeader({
  run,
  open,
  onToggle,
  newCount,
  issueCount,
  errorCount,
}: RunCardHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left cursor-pointer"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        <span className="font-mono text-zinc-400 bg-white/5 border border-border/30 px-1.5 py-0.5 rounded text-[11px] font-semibold">
          #{run.id}
        </span>

        <span className="flex items-center gap-1.5 font-semibold text-white">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          {formatRelative(run.runAt)}
        </span>

        <span className="text-zinc-600">·</span>
        <span className="text-zinc-400">{run.scannedSources} sources</span>

        {run.status === 'running' && run.scannedSources === 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Timed out / Interrupted
          </span>
        )}

        {newCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            {newCount} new
          </span>
        )}

        {issueCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
          </span>
        )}

        {errorCount > 0 && (
          <span className="text-[11px] font-semibold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full">
            {errorCount} errors
          </span>
        )}

        <span className="text-zinc-600">·</span>
        <span className="text-zinc-500 capitalize">{run.triggeredBy}</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-500 font-mono text-xs">{formatDuration(run.duration)}</span>
      </div>

      <div className="shrink-0 text-zinc-500">
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </div>
    </button>
  );
}

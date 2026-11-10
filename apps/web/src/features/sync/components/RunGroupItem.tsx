import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SyncSourceRow } from '@manhwa-tracker/shared';
import { Sparkles, AlertTriangle, ChevronDown, CheckCircle2 } from 'lucide-react';
import { getSourceBadgeClass, STATUS_CONFIG, formatDuration } from '../run-card.utils';

export interface ManhwaSyncGroup {
  manhwaId: number;
  manhwaTitle: string;
  rows: SyncSourceRow[];
  hasNew: boolean;
  hasIssue: boolean;
}

export function RunGroupItem({
  group,
  onClose,
}: {
  group: ManhwaSyncGroup;
  onClose?: () => void;
}) {
  const [expanded, setExpanded] = useState(group.hasNew || group.hasIssue);

  return (
    <div
      className={`border rounded-xl p-3.5 transition-all ${
        group.hasIssue
          ? 'bg-[#111214] border-amber-500/30 shadow-sm shadow-amber-500/5'
          : group.hasNew
          ? 'bg-[#111214] border-emerald-500/30'
          : 'bg-[#111214] border-border/20 hover:border-border/40'
      }`}
    >
      {/* Group Header */}
      <div
        className="flex items-center justify-between gap-3 cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <Link
            to={`/manhwa/${group.manhwaId}`}
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            className="font-semibold text-white hover:text-amber-400 text-sm truncate"
          >
            {group.manhwaTitle}
          </Link>

          <span className="text-[10px] text-zinc-500 bg-white/5 border border-border/20 px-1.5 py-0.2 rounded font-mono">
            {group.rows.length} {group.rows.length === 1 ? 'src' : 'srcs'}
          </span>

          {group.hasNew && (
            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> New
            </span>
          )}

          {group.hasIssue && (
            <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> Issue Found
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">
            {expanded ? 'Hide details' : 'View details'}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Source pills preview */}
      <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
        {group.rows.map((row, i) => {
          const badgeClass = getSourceBadgeClass(row.source);
          const isBad = row.status === 'issue' || row.status === 'failed' || Boolean(row.reason);

          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-medium ${badgeClass} ${
                isBad ? 'ring-1 ring-amber-500/50' : ''
              }`}
            >
              {isBad && <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
              <span>{row.source}</span>
              {row.chapterFound != null && (
                <span className="opacity-80 font-mono">ch.{row.chapterFound}</span>
              )}
            </span>
          );
        })}
      </div>

      {/* Expanded detailed rows */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/10 space-y-2 animate-panel-expand">
          {group.rows.map((row, i) => {
            const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.no_new;
            const isBad = row.status === 'issue' || row.status === 'failed' || Boolean(row.reason);

            return (
              <div
                key={i}
                className={`p-2 rounded-lg text-xs transition-colors ${
                  isBad ? 'bg-amber-500/5 border border-amber-500/20' : 'bg-[#161719]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{row.source}</span>
                    {row.chapterFound != null && (
                      <span className="font-mono text-zinc-300 text-[11px]">
                        ch. {row.chapterFound}
                      </span>
                    )}
                    {row.durationMs != null && (
                      <span className="font-mono text-zinc-500 text-[10px]">
                        {formatDuration(row.durationMs)}
                      </span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${cfg.cls}`}
                  >
                    {cfg.icon}
                    <span>{cfg.label}</span>
                  </span>
                </div>

                {/* Explicit Reason Display */}
                {row.reason && (
                  <div className="mt-1.5 pt-1.5 border-t border-border/10 flex items-start gap-1.5 text-[11px] text-amber-300/90 font-mono">
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <span className="break-words leading-relaxed">{row.reason}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

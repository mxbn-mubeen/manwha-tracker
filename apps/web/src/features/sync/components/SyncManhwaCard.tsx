import { Link } from 'react-router-dom';
import { Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ManhwaCoverImage } from '@/features/sources/components/ManhwaCoverImage';
import { getSourceBadgeClass, STATUS_CONFIG, formatDuration } from '../run-card.utils';
import type { ManhwaSyncGroup } from './RunGroupItem';

interface SyncManhwaCardProps {
  group: ManhwaSyncGroup;
  coverUrl: string | null;
  onClose?: () => void;
}

export function SyncManhwaCard({ group, coverUrl, onClose }: SyncManhwaCardProps) {
  const issueRows = group.rows.filter((r) => r.status === 'issue' || r.status === 'failed' || Boolean(r.reason));

  return (
    <div
      className={`rounded-xl p-3.5 flex flex-col justify-between gap-3 transition-all card-hover-lift shadow-sm animate-fade-up ${
        group.hasIssue
          ? 'bg-[#111214] border border-amber-500/30'
          : group.hasNew
          ? 'bg-[#111214] border border-emerald-500/30'
          : 'bg-[#111214] border border-border/20 hover:border-border/40'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-14 rounded overflow-hidden bg-zinc-900 border border-border/30 shrink-0">
          <ManhwaCoverImage src={coverUrl} alt={group.manhwaTitle} />
        </div>

        <div className="min-w-0 flex-1">
          <Link
            to={`/manhwa/${group.manhwaId}`}
            onClick={onClose}
            className="font-semibold text-white hover:text-amber-400 text-xs sm:text-sm truncate block"
            title={group.manhwaTitle}
          >
            {group.manhwaTitle}
          </Link>

          <p className="text-[11px] text-zinc-500 mt-0.5">
            {group.rows.length} {group.rows.length === 1 ? 'source' : 'sources'} checked
          </p>

          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {group.hasNew ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                New Chapter
              </span>
            ) : group.hasIssue ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                Issue Found
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 bg-white/[0.03] border border-border/20 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-2.5 h-2.5 text-zinc-500" />
                Up to date
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sources list inside the card */}
      <div className="space-y-1.5 pt-2 border-t border-border/10 bg-[#161719]/50 p-2 rounded-lg">
        {group.rows.map((row, i) => {
          const badgeCls = getSourceBadgeClass(row.source);
          const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.no_new;
          const isBad = row.status === 'issue' || row.status === 'failed' || Boolean(row.reason);

          return (
            <div key={i} className="flex items-center justify-between text-xs gap-2">
              <span
                className={`inline-flex items-center text-[10px] px-1.5 py-0.2 rounded border font-medium truncate max-w-[110px] ${badgeCls}`}
                title={row.source}
              >
                {row.source}
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                {row.chapterFound != null && (
                  <span className="font-mono text-zinc-300 text-[11px]">
                    ch.{row.chapterFound}
                  </span>
                )}
                {row.durationMs != null && (
                  <span className="font-mono text-zinc-500 text-[10px]">
                    {formatDuration(row.durationMs)}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-full ${cfg.cls}`}
                >
                  {isBad && <AlertTriangle className="w-2 h-2 text-amber-400" />}
                  <span>{cfg.label}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Issues / Reasons callouts */}
      {issueRows.length > 0 && (
        <div className="space-y-1">
          {issueRows.map((r, i) => (
            <div
              key={i}
              className="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded p-1.5 font-mono flex items-start gap-1"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-semibold text-amber-300">{r.source}: </span>
                <span className="break-words">{r.reason || 'Check failed'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

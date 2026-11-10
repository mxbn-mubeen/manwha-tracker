import { Link } from 'react-router-dom';
import type { SyncSourceRow } from '@manhwa-tracker/shared';
import { STATUS_CONFIG, getSourceBadgeClass, formatDuration } from '../run-card.utils';

interface RunRowItemProps {
  row: SyncSourceRow;
  index: number;
  onClose?: () => void;
}

export function RunRowItem({ row, index, onClose }: RunRowItemProps) {
  const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.no_new;
  const sourceClass = getSourceBadgeClass(row.source);

  return (
    <div
      className={`px-4 py-2.5 text-sm border-b border-border/10 last:border-0 hover:bg-white/[0.04] transition-colors ${
        index % 2 === 1 ? 'bg-[#161719]/40' : 'bg-transparent'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Source Badge + Manhwa Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-md border font-medium truncate shrink-0 max-w-[130px] ${sourceClass}`}
            title={row.source}
          >
            {row.source}
          </span>

          <div className="min-w-0 flex-1">
            {row.manhwaId ? (
              <Link
                to={`/manhwa/${row.manhwaId}`}
                onClick={onClose}
                className="text-zinc-200 hover:text-amber-400 font-medium text-xs sm:text-sm transition-colors truncate block"
                title={row.manhwaTitle}
              >
                {row.manhwaTitle}
              </Link>
            ) : (
              <span className="text-zinc-300 font-medium text-xs sm:text-sm truncate block" title={row.manhwaTitle}>
                {row.manhwaTitle}
              </span>
            )}
          </div>
        </div>

        {/* Right: Chapter + Duration + Status */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          {row.chapterFound != null && (
            <span className="text-xs font-mono font-medium text-zinc-300 bg-white/5 border border-border/20 px-2 py-0.5 rounded">
              ch. {row.chapterFound}
            </span>
          )}

          {row.durationMs != null && (
            <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
              {formatDuration(row.durationMs)}
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}
          >
            {cfg.icon}
            <span>{cfg.label}</span>
          </span>
        </div>
      </div>

      {/* Reason / note */}
      {row.reason && (
        <div className="mt-1 sm:pl-[145px] text-[11px] text-zinc-500 font-mono flex items-start gap-1">
          <span className="text-zinc-600">↳</span>
          <span className="break-words line-clamp-2" title={row.reason}>
            {row.reason}
          </span>
        </div>
      )}
    </div>
  );
}

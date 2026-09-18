import type { CadenceInfo } from './ManhwaHeader'

export function ManhwaCadenceInfo({ cadenceInfo }: { cadenceInfo?: CadenceInfo | null }) {
  if (cadenceInfo?.hasNewChapterToday) {
    return (
      <div className="flex items-center gap-2 text-sm mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 font-medium">
          🆕 New chapter today
        </span>
        {cadenceInfo.nextExpectedTime !== null && (
          <span className="text-muted-foreground text-xs">
            (cadence didn't predict this one — pattern will adjust on the next check)
          </span>
        )}
      </div>
    )
  }

  if (!cadenceInfo?.hasNewChapterToday && cadenceInfo?.isIrregular) {
    return (
      <div className="flex items-center gap-2 text-sm mb-3">
        <span className="text-muted-foreground">Release pattern:</span>
        <span className="text-amber-400 font-medium">⚠ Irregular — checked every sync</span>
      </div>
    )
  }

  if (!cadenceInfo?.hasNewChapterToday && !cadenceInfo?.isIrregular && cadenceInfo?.nextExpectedTime != null) {
    return (
      <div className="flex items-center gap-2 text-sm mb-3">
        <span className="text-muted-foreground">Next chapter expected:</span>
        <span className="text-zinc-300 font-medium">
          {(() => {
            const diffMs = cadenceInfo.nextExpectedTime! - Date.now();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
            if (cadenceInfo.isOverdue) return 'overdue';
            if (diffDays < 0) return 'overdue';
            if (diffDays === 0) return 'today';
            if (diffDays === 1) return 'tomorrow';
            return `in ${diffDays} days`;
          })()}
        </span>
      </div>
    )
  }

  return null;
}

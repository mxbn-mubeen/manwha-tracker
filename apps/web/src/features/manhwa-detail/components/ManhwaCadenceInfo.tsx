import type { CadenceInfo } from './ManhwaHeader'

function ReleaseBadge({ icon, label, sublabel, colorClass }: {
  icon: string;
  label: string;
  sublabel?: string;
  colorClass: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 border text-xs font-semibold ${colorClass}`}>
      <span>{icon}</span>
      <span>{label}</span>
      {sublabel && (
        <span className="opacity-60 font-normal hidden sm:inline">{sublabel}</span>
      )}
    </div>
  );
}

export function ManhwaCadenceInfo({ cadenceInfo }: { cadenceInfo?: CadenceInfo | null }) {
  const hasNewChapterToday = (() => {
    if (!cadenceInfo?.lastPublishedAt) return false;
    const today = new Date();
    const published = new Date(cadenceInfo.lastPublishedAt);
    return today.getFullYear() === published.getFullYear() &&
           today.getMonth() === published.getMonth() &&
           today.getDate() === published.getDate();
  })();

  if (hasNewChapterToday && cadenceInfo) {
    return (
      <ReleaseBadge
        icon="🆕"
        label="New chapter today"
        sublabel="pattern will adjust on next sync"
        colorClass="bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
      />
    );
  }

  if (!hasNewChapterToday && cadenceInfo?.isIrregular) {
    return (
      <ReleaseBadge
        icon="⚠️"
        label="Irregular release"
        sublabel="checked every sync"
        colorClass="bg-amber-500/10 border-amber-500/25 text-amber-400"
      />
    );
  }

  if (!hasNewChapterToday && !cadenceInfo?.isIrregular && cadenceInfo?.nextExpectedTime != null) {
    const diffMs = cadenceInfo.nextExpectedTime - Date.now();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const isOverdue = cadenceInfo.isOverdue || diffDays < 0;
    const timeLabel = isOverdue ? 'Overdue'
      : diffDays === 0 ? 'Today'
      : diffDays === 1 ? 'Tomorrow'
      : `In ${diffDays} days`;

    return (
      <ReleaseBadge
        icon={isOverdue ? '⏰' : '📅'}
        label={`Next chapter: ${timeLabel}`}
        colorClass={isOverdue
          ? 'bg-orange-500/10 border-orange-500/25 text-orange-400'
          : 'bg-blue-500/10 border-blue-500/25 text-blue-400'}
      />
    );
  }

  return null;
}

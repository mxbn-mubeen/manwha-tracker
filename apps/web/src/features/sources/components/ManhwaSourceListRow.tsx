import { Link } from 'react-router-dom';
import { Globe, Send, ChevronDown, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAdapterBadgeClass } from '../utils/adapterColors';
import { ManhwaCoverImage } from './ManhwaCoverImage';
import { SourceDetailRow } from './SourceDetailRow';
import type { ManhwaGroup } from './ManhwaSourcesView';

interface ManhwaSourceListRowProps {
  group: ManhwaGroup;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenManageModal: () => void;
}

export function ManhwaSourceListRow({
  group,
  index,
  isExpanded,
  onToggleExpand,
  onOpenManageModal,
}: ManhwaSourceListRowProps) {
  const hasTelegram = group.sources.some((s) => s.type === 'telegram');
  const hasWebsite = group.sources.some((s) => s.type === 'website');
  const isSingleSource = group.sources.length === 1;

  return (
    <div
      className="bg-[#111214] border border-border/20 rounded-xl overflow-hidden hover:border-border/40 transition-all animate-list-enter"
      style={{ '--i': index } as React.CSSProperties}
    >
      {/* Header row */}
      <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-14 rounded overflow-hidden bg-zinc-900 border border-border/20 shrink-0">
            <ManhwaCoverImage
              src={group.manhwaCover}
              alt={group.manhwaTitle}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/manhwa/${group.manhwaId}`}
                className="font-semibold text-white hover:text-amber-400 hover:underline truncate text-sm sm:text-base"
                title={group.manhwaTitle}
              >
                {group.manhwaTitle}
              </Link>
              <span className="text-[11px] text-zinc-400 bg-white/5 border border-border/30 rounded-full px-2 py-0.5">
                {group.sources.length} {group.sources.length === 1 ? 'source' : 'sources'}
              </span>

              {isSingleSource && (
                <span className="text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Needs Backup
                </span>
              )}
            </div>

            {/* Source badges */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {group.sources.map((s) => {
                const isTele = s.type === 'telegram';
                const badgeCls = getAdapterBadgeClass(s.adapterKey);
                const label = isTele
                  ? '@' + (s.url.split('/').pop()?.replace(/^@/, '') || 'telegram')
                  : s.adapterKey;

                return (
                  <span
                    key={s.id}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium ${badgeCls}`}
                  >
                    {isTele ? (
                      <Send className="w-3 h-3 text-blue-400 shrink-0" />
                    ) : (
                      <Globe className="w-3 h-3 text-amber-400 shrink-0" />
                    )}
                    <span className="truncate max-w-[150px]">{label}</span>
                  </span>
                );
              })}

              {!hasTelegram && hasWebsite && (
                <span className="text-[10px] text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                  No Telegram
                </span>
              )}
              {hasTelegram && !hasWebsite && (
                <span className="text-[10px] text-sky-500/80 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">
                  No Website
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenManageModal}
            className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 bg-[#161719] border border-amber-500/20 rounded-lg px-2.5 h-8 btn-press gap-1"
            title="Add or manage sources in modal"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Source</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="text-xs text-zinc-400 hover:text-white bg-[#161719] border border-border/20 rounded-lg px-3 h-8 btn-press"
          >
            {isExpanded ? 'Hide' : 'Manage'}
            <ChevronDown
              className={`w-3.5 h-3.5 ml-1 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </Button>
        </div>
      </div>

      {/* Expandable source details */}
      {isExpanded && (
        <div className="border-t border-border/10 bg-[#161719]/40 p-4 space-y-2.5 animate-panel-expand">
          <div className="flex items-center justify-between pb-1">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Linked Sources ({group.sources.length})
            </p>
          </div>
          {group.sources.map((s, si) => (
            <div key={s.id} className="animate-list-enter" style={{ '--i': si } as React.CSSProperties}>
              <SourceDetailRow source={s} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


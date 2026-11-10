import { useState } from 'react';
import { Send, Globe, Layers, Plus } from 'lucide-react';
import { ManhwaCoverImage } from './ManhwaCoverImage';
import { ManageSourcesModal } from './ManageSourcesModal';
import { getAdapterBadgeClass } from '../utils/adapterColors';
import type { ManhwaGroup } from './ManhwaSourcesView';

export function ManhwaSourcesCardGrid({ groups }: { groups: ManhwaGroup[] }) {
  const [selectedGroup, setSelectedGroup] = useState<ManhwaGroup | null>(null);

  if (groups.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 border border-border/20 rounded-xl bg-[#111214]">
        No manhwas found matching your filters.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {groups.map((group, i) => {
          const isSingle = group.sources.length === 1;

          return (
            <div
              key={group.manhwaId}
              onClick={() => setSelectedGroup(group)}
              className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-zinc-900 border border-border/40 hover:border-amber-500/60 transition-all cursor-pointer shadow-md hover:shadow-amber-500/10 flex flex-col justify-between card-hover-lift animate-card-enter"
              style={{ '--i': i } as React.CSSProperties}
            >
              {/* Cover image with fallback */}
              <div className="absolute inset-0">
                <ManhwaCoverImage
                  src={group.manhwaCover}
                  alt={group.manhwaTitle}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 pointer-events-none" />

              {/* Top badges */}
              <div className="relative z-10 p-2.5 flex items-center justify-between gap-1 w-full">
                <span className="text-[10px] font-semibold tracking-wide bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Layers className="w-2.5 h-2.5 text-amber-400" />
                  {group.sources.length} {group.sources.length === 1 ? 'src' : 'srcs'}
                </span>

                {isSingle && (
                  <span className="text-[9px] font-bold bg-amber-500/90 text-amber-950 px-1.5 py-0.5 rounded shadow-sm">
                    1 SOURCE
                  </span>
                )}
              </div>

              {/* Bottom content: Title & source chips */}
              <div className="relative z-10 p-3 w-full">
                <h3
                  className="font-semibold text-xs sm:text-sm text-white line-clamp-1 mb-1.5 group-hover:text-amber-400 transition-colors"
                  title={group.manhwaTitle}
                >
                  {group.manhwaTitle}
                </h3>

                {/* Source chips */}
                <div className="flex items-center gap-1 flex-wrap">
                  {group.sources.slice(0, 3).map((s) => {
                    const isTele = s.type === 'telegram';
                    const badgeCls = getAdapterBadgeClass(s.adapterKey);

                    return (
                      <span
                        key={s.id}
                        className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium ${badgeCls}`}
                      >
                        {isTele ? (
                          <Send className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                        ) : (
                          <Globe className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[80px]">
                          {isTele
                            ? '@' + (s.url.split('/').pop()?.replace(/^@/, '') || 'tg')
                            : s.adapterKey}
                        </span>
                      </span>
                    );
                  })}
                  {group.sources.length > 3 && (
                    <span className="text-[9px] text-zinc-400 bg-black/40 px-1 py-0.5 rounded">
                      +{group.sources.length - 3}
                    </span>
                  )}
                </div>

                <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400 opacity-80 group-hover:opacity-100 transition-opacity">
                  <span>Manage</span>
                  <Plus className="w-3 h-3 text-amber-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedGroup && (
        <ManageSourcesModal
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </>
  );
}


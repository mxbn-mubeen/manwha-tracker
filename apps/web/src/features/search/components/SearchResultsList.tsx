import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUnreadCount, formatUnreadCount } from '@/lib/utils';
import { ManhwaCoverImage } from '@/features/sources/components';

interface SearchResultsListProps {
  query: string;
  matchingPages: Array<{
    title: string;
    path: string;
    desc: string;
    icon: any;
  }>;
  matchingManhwa: Array<any>;
  selectedIndex: number;
  user: any;
  onClose: () => void;
}

export function SearchResultsList({
  query,
  matchingPages,
  matchingManhwa,
  selectedIndex,
  user,
  onClose,
}: SearchResultsListProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Matching Pages */}
      {matchingPages.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 py-1">
            Navigation Pages ({matchingPages.length})
          </p>
          <div className="space-y-1">
            {matchingPages.map((p, idx) => {
              const isSelected = selectedIndex === idx;
              const Icon = p.icon;
              return (
                <button
                  key={p.path}
                  onClick={() => {
                    navigate(p.path);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                    isSelected ? 'bg-amber-500/15 text-white border border-amber-500/30' : 'hover:bg-white/5 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-amber-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{p.title}</p>
                      <p className="text-xs text-zinc-500">{p.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Matching Manhwas */}
      {matchingManhwa.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 py-1">
            Manhwa Series ({matchingManhwa.length})
          </p>
          <ul className="space-y-1">
            {matchingManhwa.map((m, idx) => {
              const itemIdx = matchingPages.length + idx;
              const isSelected = selectedIndex === itemIdx;
              const isTracked = !!user && m.progress?.isTracking === true;
              const behind = isTracked ? getUnreadCount(m.progress?.latestChapter, m.progress?.lastChapter) : 0;

              return (
                <li key={m.id}>
                  <button
                    onClick={() => {
                      navigate(`/manhwa/${m.id}`);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                      isSelected ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="h-11 w-8 rounded overflow-hidden bg-zinc-900 border border-border/30 shrink-0">
                      <ManhwaCoverImage src={m.coverUrl} alt={m.title} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                        {m.title}
                      </p>
                      {isTracked ? (
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Ch. {m.progress?.lastChapter ?? 0} / {m.progress?.latestChapter ?? '?'}
                          {behind > 0 && (
                            <span className="ml-2 text-amber-400 font-medium">+{formatUnreadCount(behind)} unread</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Latest: Ch. {m.progress?.latestChapter ?? '?'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/30 text-zinc-400 bg-white/5 font-mono">
                        #{m.id}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {matchingPages.length === 0 && matchingManhwa.length === 0 && (
        <div className="py-12 text-center text-zinc-500 text-sm">
          No manhwa or pages matching <span className="text-white">"{query}"</span>
        </div>
      )}
    </>
  );
}

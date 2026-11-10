import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Clock, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { getUnreadCount, formatUnreadCount } from '@/lib/utils';
import { formatTimeAgo } from '@manhwa-tracker/utils';
import { ManhwaCoverImage } from '@/features/sources/components/ManhwaCoverImage';
import type { RouterOutputs } from '@/lib/trpc';

type Manhwa = RouterOutputs['manhwa']['getAll'][number];

interface RecentActivityProps {
  manhwas: Manhwa[];
}

export function RecentActivity({ manhwas }: RecentActivityProps) {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Recent Activity</h2>
          <p className="text-sm text-muted-foreground">Latest updates and progress from your tracked titles</p>
        </div>
        <Link
          to="/library"
          className="text-xs font-semibold text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1 bg-[#161719] border border-border/20 px-3 py-1.5 rounded-lg btn-press"
        >
          <span>View Library</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Activity List Container */}
      <div className="bg-[#111214] border border-border/20 rounded-2xl overflow-hidden divide-y divide-border/10 shadow-sm">
        {manhwas.map((m, i) => {
          const lastCh = m.progress?.lastChapter ?? 0;
          const latestCh = m.progress?.latestChapter ?? 0;
          const unread = getUnreadCount(latestCh, lastCh);
          const isCaughtUp = unread === 0 && latestCh > 0;
          const progressPercent = latestCh > 0 ? Math.min(100, Math.max(0, (lastCh / latestCh) * 100)) : 100;

          return (
            <Link
              to={`/manhwa/${m.id}`}
              key={m.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-white/[0.04] transition-all group animate-list-enter ${
                i % 2 === 1 ? 'bg-[#161719]/30' : 'bg-transparent'
              }`}
              style={{ '--i': i } as React.CSSProperties}
            >
              {/* Left: Cover Thumbnail & Title Info */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="relative h-14 w-10 rounded-md bg-zinc-900 overflow-hidden shrink-0 border border-border/30 group-hover:border-amber-500/40 group-hover:scale-105 transition-all duration-200">
                  <ManhwaCoverImage src={m.coverUrl} alt={m.title} />
                  {isCaughtUp && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-black" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-sm sm:text-base text-white group-hover:text-amber-400 transition-colors truncate">
                    {m.title}
                  </h4>

                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-zinc-400 font-mono">
                      Ch. {lastCh} <span className="text-zinc-600">/</span> {latestCh || '?'}
                    </span>

                    {/* Miniature Progress Bar */}
                    <div className="w-20 sm:w-28 bg-zinc-800 rounded-full h-1.5 overflow-hidden border border-white/5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCaughtUp ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {isCaughtUp ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/90 font-medium">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Caught up
                      </span>
                    ) : unread > 0 ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1.5 text-amber-400 border-amber-500/30 bg-amber-500/10 font-semibold"
                      >
                        +{formatUnreadCount(unread)} new
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Right: Timestamp and Arrow */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <div className="text-xs text-zinc-500 flex items-center gap-1.5 font-mono">
                  <Clock size={12} className="text-zinc-500" />
                  <span>{m.updatedAt ? formatTimeAgo(m.updatedAt) : 'recently'}</span>
                </div>

                <div className="hidden sm:flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 border border-border/20 text-zinc-400 group-hover:text-amber-400 group-hover:bg-amber-500/10 group-hover:border-amber-500/30 transition-all">
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </Link>
          );
        })}

        {manhwas.length === 0 && (
          <div className="p-10 text-center text-muted-foreground text-sm">
            No recent activity recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}

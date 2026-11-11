import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Sparkles, ChevronLeft, ChevronRight, ArrowRight, BookOpen } from 'lucide-react';
import { getUnreadCount, formatUnreadCount } from '@/lib/utils';
import { ManhwaCoverImage } from '@/features/sources/components/ManhwaCoverImage';

interface UnreadManhwaStripProps {
  currentManhwaId: number;
}

export function UnreadManhwaStrip({ currentManhwaId }: UnreadManhwaStripProps) {
  const { data: all = [] } = trpc.manhwa.getAll.useQuery();
  const scrollRef = useRef<HTMLDivElement>(null);

  const unread = all
    .filter((m) => {
      if (m.id === currentManhwaId) return false;
      return getUnreadCount(m.progress?.latestChapter, m.progress?.lastChapter) > 0;
    })
    .sort((a, b) => {
      const gapA = getUnreadCount(a.progress?.latestChapter, a.progress?.lastChapter);
      const gapB = getUnreadCount(b.progress?.latestChapter, b.progress?.lastChapter);
      return gapB - gapA;
    });

  if (unread.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 380;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className="mt-12 bg-[#111214] border border-border/20 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Up Next in Your Library
              </h2>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                {unread.length} unread
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 hidden sm:block">
              Other series with new chapters waiting to be read
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Scroll Arrows */}
          <div className="flex items-center gap-1 bg-[#161719] border border-border/20 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => scroll('left')}
              className="h-7 w-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors btn-press"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              className="h-7 w-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors btn-press"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Link
            to="/library?filter=Reading"
            className="hidden sm:flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-amber-400 transition-colors px-2.5 py-1.5 rounded-lg bg-[#161719] border border-border/20 hover:border-amber-500/30"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Carousel Strip ── */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-3.5 sm:gap-4 pb-2 pt-1 snap-x scroll-smooth select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {unread.map((m) => {
          const latest = m.progress?.latestChapter ?? 0;
          const last = m.progress?.lastChapter ?? 0;
          const behind = getUnreadCount(latest, last);
          const progressPercent = latest > 0 ? Math.min(100, Math.max(0, (last / latest) * 100)) : 0;

          return (
            <Link
              key={m.id}
              to={`/manhwa/${m.id}`}
              className="group flex flex-col min-w-[150px] sm:min-w-[170px] max-w-[195px] flex-1 bg-[#161719]/70 hover:bg-[#161719] border border-border/20 hover:border-amber-500/40 rounded-xl p-3 transition-all duration-200 card-hover-lift shrink-0 snap-start"
            >
              {/* Cover Art with Badge */}
              <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-white/5 mb-2.5">
                <ManhwaCoverImage
                  src={m.coverUrl}
                  alt={m.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Unread Chapter Pill Badge */}
                <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md border border-amber-500/40 px-2 py-0.5 rounded-full shadow-lg shadow-black/40">
                  <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5 font-mono">
                    +{formatUnreadCount(behind)}
                  </span>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <h3
                    className="text-xs sm:text-sm font-semibold text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug mb-1"
                    title={m.title}
                  >
                    {m.title}
                  </h3>
                </div>

                <div className="mt-2 space-y-1.5">
                  {/* Miniature Progress Track */}
                  <div className="w-full bg-zinc-800/80 rounded-full h-1 overflow-hidden border border-white/5">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <span>Ch. {last}</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-zinc-300">{latest || '?'}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

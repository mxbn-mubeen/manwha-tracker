import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { BookOpen } from 'lucide-react';
import { getProxiedImageUrl } from '@/utils/image';

interface UnreadManhwaStripProps {
  currentManhwaId: number;
}

export function UnreadManhwaStrip({ currentManhwaId }: UnreadManhwaStripProps) {
  const { data: all } = trpc.manhwa.getAll.useQuery();

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const isDragging = useRef(false);

  const unread = (all ?? [])
    .filter(m => {
      if (m.id === currentManhwaId) return false;
      const latest = m.progress?.latestChapter ?? 0;
      const last   = m.progress?.lastChapter   ?? 0;
      return latest > last;
    })
    .sort((a, b) => {
      // Sort by most chapters behind (biggest gap first)
      const gapA = (a.progress?.latestChapter ?? 0) - (a.progress?.lastChapter ?? 0);
      const gapB = (b.progress?.latestChapter ?? 0) - (b.progress?.lastChapter ?? 0);
      return gapB - gapA;
    });

  if (unread.length === 0) return null;

  const onMouseDown = (e: React.MouseEvent) => {
    isDown.current = true;
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grabbing';
      scrollRef.current.style.scrollSnapType = 'none'; // disable snap during drag
      startX.current = e.pageX - scrollRef.current.offsetLeft;
      scrollLeft.current = scrollRef.current.scrollLeft;
    }
  };

  const onMouseLeave = () => {
    isDown.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = '';
      scrollRef.current.style.scrollSnapType = '';
    }
  };

  const onMouseUp = () => {
    isDown.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = '';
      scrollRef.current.style.scrollSnapType = '';
    }
    // Defer reset so onClick fires first with isDragging still true if needed
    setTimeout(() => {
      isDragging.current = false;
    }, 0);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    if (Math.abs(walk) > 5) {
      isDragging.current = true;
    }
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  return (
    <section className="mt-10 pt-8 border-t border-border/20">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Up Next — Unread ({unread.length})
        </h2>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        className="flex overflow-x-auto gap-4 pb-4 snap-x select-none [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {unread.map(m => {
          const latest = m.progress?.latestChapter ?? 0;
          const last   = m.progress?.lastChapter   ?? 0;
          const behind = latest - last;

          return (
            <Link
              key={m.id}
              to={`/manhwa/${m.id}`}
              onClick={(e) => {
                if (isDragging.current) e.preventDefault();
              }}
              draggable={false}
              className="group flex flex-col gap-3 min-w-[160px] w-[160px] p-3 rounded-xl bg-[#111213] border border-border/20 hover:border-amber-500/30 hover:bg-[#161719] transition-all shrink-0 snap-start"
            >
              {/* Cover */}
              <div className="w-full aspect-[2/3] rounded-lg overflow-hidden shrink-0 bg-zinc-800 relative">
                {m.coverUrl ? (
                  <img
                    src={getProxiedImageUrl(m.coverUrl) as string}
                    alt={m.title}
                    draggable={false}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-zinc-600" />
                  </div>
                )}
                {/* Behind badge overlay */}
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm border border-amber-500/30 px-2 py-0.5 rounded-full shadow-lg">
                  <span className="text-[10px] font-bold text-amber-400">
                    +{behind}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate group-hover:text-amber-300 transition-colors" title={m.title}>
                  {m.title}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Ch. {last} / {latest}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}



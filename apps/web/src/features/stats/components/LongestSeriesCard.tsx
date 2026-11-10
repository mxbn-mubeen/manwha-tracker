import { Link } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { ManhwaCoverImage } from '@/features/sources/components/ManhwaCoverImage';

export interface SeriesStatItem {
  id: number;
  title: string;
  chapters: number;
  coverUrl: string | null;
}

interface LongestSeriesCardProps {
  seriesList: SeriesStatItem[];
}

export function LongestSeriesCard({ seriesList }: LongestSeriesCardProps) {
  return (
    <div className="bg-[#111214] border border-border/20 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <span>Longest Series</span>
        </h2>
        <span className="text-xs text-zinc-500">By chapter count</span>
      </div>

      <div className="space-y-2.5">
        {seriesList.map((series, idx) => {
          const rankBadgeClass =
            idx === 0
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : idx === 1
              ? 'bg-zinc-300/20 text-zinc-200 border-zinc-300/40'
              : idx === 2
              ? 'bg-amber-700/20 text-amber-400 border-amber-700/40'
              : 'bg-white/5 text-zinc-400 border-border/30';

          return (
            <Link
              to={`/manhwa/${series.id}`}
              key={series.id}
              className="flex items-center gap-3.5 p-2.5 rounded-xl bg-[#161719]/60 hover:bg-[#161719] border border-border/20 hover:border-border/40 transition-all group animate-list-enter"
              style={{ '--i': idx } as React.CSSProperties}
            >
              <span
                className={`font-mono text-xs font-bold w-6 h-6 rounded-md flex items-center justify-center border shrink-0 ${rankBadgeClass}`}
              >
                {idx + 1}
              </span>

              {/* ManhwaCoverImage with proper referrer stripping and fallback */}
              <div className="w-9 h-12 rounded-md bg-zinc-900 border border-border/30 overflow-hidden shrink-0 group-hover:border-amber-500/40 transition-colors">
                <ManhwaCoverImage src={series.coverUrl} alt={series.title} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-200 group-hover:text-amber-400 transition-colors truncate">
                  {series.title}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Rank #{idx + 1} longest series</p>
              </div>

              <span className="text-xs font-mono font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg shrink-0">
                {series.chapters.toLocaleString()} ch
              </span>
            </Link>
          );
        })}
        {seriesList.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-6">No series tracked yet.</p>
        )}
      </div>
    </div>
  );
}

import { trpc } from '@/lib/trpc';
import { usePageTitle } from '@/lib/usePageTitle';
import { 
  BarChart3, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Globe, 
  Library, 
  PlayCircle, 
  Send, 
  XCircle 
} from 'lucide-react';

export function StatsPage() {
  usePageTitle('Stats');

  const { data: stats, isLoading } = trpc.stats.getOverview.useQuery(undefined, {
    staleTime: 60 * 1000,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  const { totalManhwa, totalTrackedChapters, totalUnreadChapters, statusCounts, sourceDistribution, longestSeries } = stats;

  return (
    <div className="space-y-6 pb-10 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Library Stats</h1>
        <p className="text-muted-foreground">Insights and metrics across your entire manhwa collection.</p>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111213] border border-border/30 rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Library className="h-16 w-16" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Total Series</p>
          <p className="text-4xl font-bold text-white">{totalManhwa.toLocaleString()}</p>
        </div>
        
        <div className="bg-[#111213] border border-border/30 rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BarChart3 className="h-16 w-16" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Total Chapters</p>
          <p className="text-4xl font-bold text-white">{totalTrackedChapters.toLocaleString()}</p>
        </div>

        <div className="bg-[#111213] border border-border/30 rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <BookOpen className="h-16 w-16" />
          </div>
          <p className="text-sm font-medium text-zinc-400">Unread Chapters</p>
          <p className="text-4xl font-bold text-amber-500">{totalUnreadChapters.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-[#0e0f11] border border-border/30 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            Status Breakdown
          </h2>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-zinc-300">
                <PlayCircle className="h-4 w-4 text-emerald-500" /> Ongoing
              </span>
              <span className="font-medium">{statusCounts.ongoing}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.max(2, (statusCounts.ongoing / Math.max(1, totalManhwa)) * 100)}%` }} />
            </div>

            <div className="flex items-center justify-between text-sm pt-2">
              <span className="flex items-center gap-2 text-zinc-300">
                <CheckCircle2 className="h-4 w-4 text-purple-500" /> Completed
              </span>
              <span className="font-medium">{statusCounts.completed}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.max(2, (statusCounts.completed / Math.max(1, totalManhwa)) * 100)}%` }} />
            </div>

            <div className="flex items-center justify-between text-sm pt-2">
              <span className="flex items-center gap-2 text-zinc-300">
                <Clock className="h-4 w-4 text-amber-500" /> Hiatus
              </span>
              <span className="font-medium">{statusCounts.hiatus}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2">
              <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.max(2, (statusCounts.hiatus / Math.max(1, totalManhwa)) * 100)}%` }} />
            </div>

            <div className="flex items-center justify-between text-sm pt-2">
              <span className="flex items-center gap-2 text-zinc-300">
                <XCircle className="h-4 w-4 text-red-500" /> Dropped
              </span>
              <span className="font-medium">{statusCounts.dropped}</span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full" style={{ width: `${Math.max(2, (statusCounts.dropped / Math.max(1, totalManhwa)) * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Source Distribution */}
          <div className="bg-[#0e0f11] border border-border/30 rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-500" />
              Source Distribution
            </h2>
            
            <div className="flex gap-4">
              <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                <Globe className="h-6 w-6 text-blue-400 mb-2" />
                <p className="text-2xl font-bold text-white">{sourceDistribution.website}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-1">Websites</p>
              </div>
              <div className="flex-1 bg-[#229ED9]/10 border border-[#229ED9]/20 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                <Send className="h-6 w-6 text-[#229ED9] mb-2" />
                <p className="text-2xl font-bold text-white">{sourceDistribution.telegram}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-1">Telegram</p>
              </div>
            </div>
          </div>

          {/* Longest Series */}
          <div className="bg-[#0e0f11] border border-border/30 rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-500" />
              Longest Series
            </h2>
            
            <div className="space-y-3">
              {longestSeries.map((series, idx) => (
                <div key={series.id} className="flex items-center gap-3">
                  <span className="text-zinc-600 font-mono text-xs font-bold w-4">{idx + 1}.</span>
                  {series.coverUrl ? (
                    <img src={series.coverUrl} className="w-8 h-10 object-cover rounded opacity-80" alt="" />
                  ) : (
                    <div className="w-8 h-10 bg-white/5 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{series.title}</p>
                  </div>
                  <span className="text-xs font-mono text-zinc-400 bg-white/5 px-2 py-1 rounded">
                    {series.chapters} ch
                  </span>
                </div>
              ))}
              {longestSeries.length === 0 && (
                <p className="text-sm text-zinc-500">No series tracked yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

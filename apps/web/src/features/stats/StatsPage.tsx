import { Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatUnreadCount } from '@/lib/utils';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Globe,
  Library,
  PlayCircle,
  Send,
  XCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { LongestSeriesCard } from './components/LongestSeriesCard';

export function StatsPage() {
  usePageTitle('Stats');

  const { data: stats, isLoading } = trpc.stats.getOverview.useQuery(undefined, {
    staleTime: 60 * 1000,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
      </div>
    );
  }

  const {
    totalManhwa,
    totalTrackedChapters,
    totalUnreadChapters,
    statusCounts,
    sourceDistribution,
    longestSeries,
  } = stats;

  const totalSources = sourceDistribution.website + sourceDistribution.telegram;
  const webPercent = totalSources > 0 ? Math.round((sourceDistribution.website / totalSources) * 100) : 0;
  const telePercent = totalSources > 0 ? 100 - webPercent : 0;

  const readChapters = Math.max(0, totalTrackedChapters - totalUnreadChapters);
  const readPercentage = totalTrackedChapters > 0 ? Math.round((readChapters / totalTrackedChapters) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
            Library Analytics
          </h1>
          <p className="text-muted-foreground text-sm">
            Insights, completion rates, and metrics across your entire manhwa collection.
          </p>
        </div>
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors self-start sm:self-auto bg-[#161719] border border-border/20 hover:border-border/40 px-3 py-1.5 rounded-lg btn-press"
        >
          <span>Explore Library</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/library"
          className="bg-[#111214] border border-border/20 rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm card-hover-lift hover:border-purple-500/40 transition-all group animate-fade-up"
          style={{ '--i': 0 } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Series</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Library className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-white tracking-tight">{totalManhwa.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Tracked titles in collection</p>
          </div>
        </Link>

        <div
          className="bg-[#111214] border border-border/20 rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm card-hover-lift hover:border-zinc-500/40 transition-all group animate-fade-up"
          style={{ '--i': 1 } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Chapters</span>
            <div className="h-8 w-8 rounded-lg bg-white/5 text-zinc-300 border border-border/30 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-white tracking-tight">{totalTrackedChapters.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Scanned across all sources</p>
          </div>
        </div>

        <Link
          to="/library?filter=Unread"
          className="bg-[#111214] border border-border/20 rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm card-hover-lift hover:border-amber-500/40 transition-all group animate-fade-up"
          style={{ '--i': 2 } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Unread Chapters</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-amber-400 tracking-tight">{formatUnreadCount(totalUnreadChapters)}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {totalUnreadChapters === 0 ? 'All caught up!' : 'New chapters waiting'}
            </p>
          </div>
        </Link>

        <div
          className="bg-[#111214] border border-border/20 rounded-xl p-5 flex flex-col justify-between gap-3 shadow-sm card-hover-lift hover:border-emerald-500/40 transition-all group animate-fade-up"
          style={{ '--i': 3 } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Read Progress</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-400 tracking-tight">{readPercentage}%</p>
            <p className="text-xs text-zinc-500 mt-0.5">{readChapters.toLocaleString()} chapters read</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Status Breakdown + Sources & Longest Series */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Status Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-[#111214] border border-border/20 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-400" />
              <span>Status Breakdown</span>
            </h2>
            <span className="text-xs text-zinc-500">{totalManhwa} total</span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Ongoing */}
            <Link
              to="/library?filter=Reading"
              className="block p-3 rounded-xl bg-[#161719]/60 hover:bg-[#161719] border border-border/20 hover:border-border/40 transition-all group"
            >
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="flex items-center gap-2 text-zinc-200 group-hover:text-emerald-400 transition-colors font-medium">
                  <PlayCircle className="h-4 w-4 text-emerald-400" /> Ongoing
                </span>
                <span className="font-semibold text-white">
                  {statusCounts.ongoing}{' '}
                  <span className="text-xs text-zinc-500 font-normal">
                    ({totalManhwa > 0 ? Math.round((statusCounts.ongoing / totalManhwa) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-border/10">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, (statusCounts.ongoing / Math.max(1, totalManhwa)) * 100)}%` }}
                />
              </div>
            </Link>

            {/* Completed */}
            <Link
              to="/library?filter=Completed"
              className="block p-3 rounded-xl bg-[#161719]/60 hover:bg-[#161719] border border-border/20 hover:border-border/40 transition-all group"
            >
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="flex items-center gap-2 text-zinc-200 group-hover:text-purple-400 transition-colors font-medium">
                  <CheckCircle2 className="h-4 w-4 text-purple-400" /> Completed
                </span>
                <span className="font-semibold text-white">
                  {statusCounts.completed}{' '}
                  <span className="text-xs text-zinc-500 font-normal">
                    ({totalManhwa > 0 ? Math.round((statusCounts.completed / totalManhwa) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-border/10">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, (statusCounts.completed / Math.max(1, totalManhwa)) * 100)}%` }}
                />
              </div>
            </Link>

            {/* Hiatus */}
            <Link
              to="/library?filter=Hiatus"
              className="block p-3 rounded-xl bg-[#161719]/60 hover:bg-[#161719] border border-border/20 hover:border-border/40 transition-all group"
            >
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="flex items-center gap-2 text-zinc-200 group-hover:text-amber-400 transition-colors font-medium">
                  <Clock className="h-4 w-4 text-amber-400" /> Hiatus
                </span>
                <span className="font-semibold text-white">
                  {statusCounts.hiatus}{' '}
                  <span className="text-xs text-zinc-500 font-normal">
                    ({totalManhwa > 0 ? Math.round((statusCounts.hiatus / totalManhwa) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-border/10">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, (statusCounts.hiatus / Math.max(1, totalManhwa)) * 100)}%` }}
                />
              </div>
            </Link>

            {/* Dropped */}
            {statusCounts.dropped > 0 && (
              <Link
                to="/library?filter=Dropped"
                className="block p-3 rounded-xl bg-[#161719]/60 hover:bg-[#161719] border border-border/20 hover:border-border/40 transition-all group"
              >
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-zinc-200 group-hover:text-red-400 transition-colors font-medium">
                    <XCircle className="h-4 w-4 text-red-400" /> Dropped
                  </span>
                  <span className="font-semibold text-white">
                    {statusCounts.dropped}{' '}
                    <span className="text-xs text-zinc-500 font-normal">
                      ({totalManhwa > 0 ? Math.round((statusCounts.dropped / totalManhwa) * 100) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-border/10">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, (statusCounts.dropped / Math.max(1, totalManhwa)) * 100)}%` }}
                  />
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Right Column: Source Distribution & Longest Series (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Source Distribution */}
          <div className="bg-[#111214] border border-border/20 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-amber-400" />
                <span>Source Distribution</span>
              </h2>
              <Link
                to="/sources"
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Manage Sources</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Websites: Amber Theme */}
              <Link
                to="/sources"
                className="bg-[#161719] border border-border/20 hover:border-amber-500/40 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all card-hover-lift group"
              >
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Globe className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-white">{sourceDistribution.website}</p>
                <p className="text-xs text-amber-400/90 uppercase tracking-wider font-semibold mt-0.5">Websites</p>
                <span className="text-[11px] text-zinc-500 mt-1 font-mono">{webPercent}% of total</span>
              </Link>

              {/* Telegram: Sky Blue Theme */}
              <Link
                to="/sources"
                className="bg-[#161719] border border-border/20 hover:border-sky-500/40 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all card-hover-lift group"
              >
                <div className="h-10 w-10 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Send className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-white">{sourceDistribution.telegram}</p>
                <p className="text-xs text-sky-400/90 uppercase tracking-wider font-semibold mt-0.5">Telegram</p>
                <span className="text-[11px] text-zinc-500 mt-1 font-mono">{telePercent}% of total</span>
              </Link>
            </div>

            {/* Split bar: Amber (Websites) vs Sky Blue (Telegram) with clear contrast */}
            <div className="space-y-1.5 pt-1">
              <div className="w-full bg-zinc-900 rounded-full h-2.5 flex overflow-hidden border border-border/10 p-0.5">
                <div
                  className="bg-amber-500 h-full rounded-l-full transition-all duration-500"
                  style={{ width: `${webPercent}%` }}
                  title={`Websites: ${webPercent}%`}
                />
                <div
                  className="bg-sky-400 h-full rounded-r-full transition-all duration-500"
                  style={{ width: `${telePercent}%` }}
                  title={`Telegram: ${telePercent}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 px-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Websites ({webPercent}%)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>Telegram ({telePercent}%)</span>
                </span>
              </div>
            </div>
          </div>

          {/* Longest Series */}
          <LongestSeriesCard seriesList={longestSeries} />
        </div>
      </div>
    </div>
  );
}

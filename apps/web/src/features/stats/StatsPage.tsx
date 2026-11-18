import { Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatUnreadCount } from '@/lib/utils';
import {
  BookOpen,
  CheckCircle2,
  Globe,
  Library,
  Send,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { LongestSeriesCard } from './components/LongestSeriesCard';
import { StatusBreakdownCard } from './components/StatusBreakdownCard';

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
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Titles */}
        <Link
          to="/library"
          className="bg-[#111214] border border-border/20 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all card-hover-lift group"
        >
          <div className="flex items-center justify-between text-zinc-400 group-hover:text-amber-400 transition-colors">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Titles</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Library className="h-4 w-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-white tracking-tight">{totalManhwa}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Series tracked</p>
          </div>
        </Link>

        {/* Total Chapters Tracked */}
        <div className="bg-[#111214] border border-border/20 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Chapters</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <BookOpen className="h-4 w-4 text-blue-400" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-white tracking-tight">{totalTrackedChapters.toLocaleString()}</p>
            <p className="text-xs text-zinc-500 mt-0.5">Available across all sources</p>
          </div>
        </div>

        {/* Unread Chapters */}
        <Link
          to="/library?filter=Ongoing"
          className="bg-[#111214] border border-border/20 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all card-hover-lift group"
        >
          <div className="flex items-center justify-between text-zinc-400 group-hover:text-amber-400 transition-colors">
            <span className="text-xs font-semibold uppercase tracking-wider">Unread Chapters</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <TrendingUp className="h-4 w-4 text-amber-400" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-amber-400 tracking-tight">
              {formatUnreadCount(totalUnreadChapters)}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">Chapters behind latest</p>
          </div>
        </Link>

        {/* Completion Rate */}
        <div className="bg-[#111214] border border-border/20 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Reading Progress</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-emerald-400 tracking-tight">{readPercentage}%</p>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{readChapters.toLocaleString()} chapters read</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Status Breakdown + Sources & Longest Series */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <StatusBreakdownCard statusCounts={statusCounts} totalManhwa={totalManhwa} />

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

          <LongestSeriesCard seriesList={longestSeries} />
        </div>
      </div>
    </div>
  );
}

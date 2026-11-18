import { Link } from 'react-router-dom';
import { BarChart3, PlayCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface StatusBreakdownCardProps {
  statusCounts: {
    ongoing: number;
    completed: number;
    hiatus: number;
    dropped: number;
  };
  totalManhwa: number;
}

export function StatusBreakdownCard({ statusCounts, totalManhwa }: StatusBreakdownCardProps) {
  const calcPercent = (count: number) =>
    totalManhwa > 0 ? Math.round((count / totalManhwa) * 100) : 0;

  return (
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
          to="/library?filter=Ongoing"
          className="block p-3 rounded-xl bg-[#161719]/60 hover:bg-[#161719] border border-border/20 hover:border-border/40 transition-all group"
        >
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="flex items-center gap-2 text-zinc-200 group-hover:text-emerald-400 transition-colors font-medium">
              <PlayCircle className="h-4 w-4 text-emerald-400" /> Ongoing
            </span>
            <span className="font-semibold text-white">
              {statusCounts.ongoing}{' '}
              <span className="text-xs text-zinc-500 font-normal">
                ({calcPercent(statusCounts.ongoing)}%)
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
                ({calcPercent(statusCounts.completed)}%)
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
                ({calcPercent(statusCounts.hiatus)}%)
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
        <Link
          to="/library?filter=Dropped"
          className="block p-3 rounded-xl bg-[#161719]/60 hover:bg-[#161719] border border-border/20 hover:border-border/40 transition-all group"
        >
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="flex items-center gap-2 text-zinc-200 group-hover:text-rose-400 transition-colors font-medium">
              <XCircle className="h-4 w-4 text-rose-400" /> Dropped
            </span>
            <span className="font-semibold text-white">
              {statusCounts.dropped}{' '}
              <span className="text-xs text-zinc-500 font-normal">
                ({calcPercent(statusCounts.dropped)}%)
              </span>
            </span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-border/10">
            <div
              className="bg-rose-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(2, (statusCounts.dropped / Math.max(1, totalManhwa)) * 100)}%` }}
            />
          </div>
        </Link>
      </div>
    </div>
  );
}

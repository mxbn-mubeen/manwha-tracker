import { trpc } from '@/lib/trpc';
import { Clock } from 'lucide-react';
import { RunCard } from '@/features/sync/RunCard';
import type { SyncRun } from '@manhwa-tracker/shared';

export function SyncHistorySection() {
  const { data: history = [] } = trpc.sync.getHistory.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
          <Clock className="h-4 w-4 text-amber-400" />
          Sync History
        </h2>
        <p className="text-sm text-zinc-400 mt-0.5">
          View recent chapter sync operations and their outcomes.
        </p>
      </div>

      <div className="bg-[#111214] border border-border/20 rounded-xl p-4 space-y-3">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-500 gap-2">
            <Clock className="h-6 w-6 opacity-30 text-zinc-400" />
            <p className="text-sm">No syncs recorded yet.</p>
          </div>
        ) : (
          history.map((run, i) => <RunCard key={i} run={run as SyncRun} onClose={() => {}} />)
        )}
      </div>
    </section>
  );
}

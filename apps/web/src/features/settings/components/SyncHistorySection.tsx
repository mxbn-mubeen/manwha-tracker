import { trpc } from '@/lib/trpc';
import { Clock } from 'lucide-react';
import { RunCard } from '@/features/sync/SyncHistoryDrawer';
import type { SyncRun } from '@manhwa-tracker/shared';

export function SyncHistorySection() {
  const { data: history = [] } = trpc.sync.getHistory.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
          <Clock className="h-5 w-5 text-amber-500" />
          Sync History
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          View recent sync operations and their outcomes.
        </p>
      </div>

      <div className="bg-[#0e0f11] border border-border/30 rounded-xl p-4 space-y-3">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-600 gap-2">
            <Clock className="h-6 w-6 opacity-30" />
            <p className="text-sm">No syncs yet this session.</p>
          </div>
        ) : (
          history.map((run, i) => <RunCard key={i} run={run as SyncRun} />)
        )}
      </div>
    </section>
  );
}

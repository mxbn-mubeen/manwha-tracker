import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

export function SyncSplitButton() {
  const utils = trpc.useUtils();
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number } | null>(null);

  // Close dropdown on window resize or scroll
  useEffect(() => {
    if (!menuCoords) return;
    const handleClose = () => setMenuCoords(null);
    window.addEventListener('resize', handleClose);
    window.addEventListener('scroll', handleClose, true);
    return () => {
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [menuCoords]);

  const { data: serverIsSyncing = false } = trpc.sync.isSyncing.useQuery(undefined, {
    refetchInterval: (query) => (query.state.data ? 2000 : 30000),
  });

  const { data: syncProgress } = trpc.sync.getProgress.useQuery(undefined, {
    refetchInterval: serverIsSyncing ? 2000 : false,
    enabled: serverIsSyncing,
  });

  const syncMutation = trpc.sync.run.useMutation({
    onSuccess: async (result) => {
      await utils.manhwa.getAll.invalidate();
      if (!result) {
        toast.info('Sync is still running in the background. Check Sync History for results.');
        return;
      }
      if ((result as any).startedAsync) {
        toast.info('🔄 Sync started in the background. The Syncing indicator will clear when done.');
        return;
      }
      if (result.errors.length > 0) {
        const maxErrors = 3;
        const displayErrors = result.errors.slice(0, maxErrors);
        const hasMore = result.errors.length > maxErrors;
        const errorDescription = (
          <div className="mt-1 flex flex-col gap-1 text-xs">
            <ul className="space-y-0.5">
              {displayErrors.map((e: string, i: number) => (
                <li key={i} className="truncate opacity-90">{e}</li>
              ))}
            </ul>
            {hasMore && (
              <span className="opacity-70 mt-0.5 italic">
                ...and {result.errors.length - maxErrors} more. Check Sync History for full details.
              </span>
            )}
          </div>
        );
        toast.warning(
          `Sync finished with ${result.errors.length} issue(s). Found ${result.newChapters} new chapter(s).`,
          { description: errorDescription, duration: 5000 }
        );
      } else if (result.newChapters > 0) {
        toast.success(`Sync complete! Found ${result.newChapters} new chapter(s) across ${result.updatedManhwa} title(s).`);
      } else {
        toast.success(`Sync complete! Scanned ${result.scannedSources} source(s) — no new chapters.`);
      }
    },
    onError: (err) => {
      toast.error('Sync failed', { description: err.message });
    },
  });

  const isSyncing = syncMutation.isPending || serverIsSyncing;

  const handleSync = (forceFullRefresh: boolean = false) => {
    if (isSyncing) return;
    syncMutation.mutate({ scope: 'all', forceFullRefresh });
    setMenuCoords(null);
  };

  return (
    <div className="relative flex items-center bg-[#161719] rounded-lg border border-border/20">
      {/* Primary Sync button */}
      <button
        type="button"
        onClick={() => handleSync(false)}
        disabled={isSyncing}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-l-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed btn-press cursor-pointer"
        title="Sync updates"
      >
        <RefreshCw className={`h-3.5 w-3.5 text-amber-400 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className={isSyncing ? 'inline font-mono text-[11px]' : 'hidden sm:inline font-medium'}>
          {isSyncing
            ? syncProgress
              ? `${syncProgress.completed}/${syncProgress.total}`
              : 'Syncing…'
            : 'Sync'}
        </span>
      </button>

      {/* Down arrow trigger for full refresh */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (menuCoords) {
            setMenuCoords(null);
          } else {
            const rect = e.currentTarget.getBoundingClientRect();
            setMenuCoords({
              top: rect.bottom + 6,
              right: Math.max(8, window.innerWidth - rect.right),
            });
          }
        }}
        disabled={isSyncing}
        aria-label="More sync options"
        className="h-7 px-1.5 border-l border-border/20 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-r-lg transition-all disabled:opacity-50 cursor-pointer"
      >
        <ChevronDown className="h-3 w-3" />
      </button>

      {/* Portal dropdown to escape header backdrop-filter and overflow clipping */}
      {menuCoords &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={(e) => {
                e.stopPropagation();
                setMenuCoords(null);
              }}
            />
            <div
              className="fixed w-60 rounded-xl border border-border/30 bg-[#161719] shadow-2xl z-[9999] p-2 animate-card-enter backdrop-blur-xl"
              style={{ top: menuCoords.top, right: menuCoords.right }}
            >
              <button
                type="button"
                onClick={() => handleSync(true)}
                disabled={isSyncing}
                className="w-full text-left px-3 py-2 text-xs rounded-lg text-zinc-200 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-all cursor-pointer group"
              >
                <div className="font-semibold flex items-center gap-1.5 text-amber-400 group-hover:text-amber-300">
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Full Refresh</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">Bypasses cadence — checks every source</div>
              </button>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}

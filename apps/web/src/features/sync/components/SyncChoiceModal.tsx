import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Zap, History, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface SyncChoiceModalProps {
  open: boolean;
  onClose: () => void;
  onOpenHistory?: () => void;
}

export function SyncChoiceModal({ open, onClose, onOpenHistory }: SyncChoiceModalProps) {
  const utils = trpc.useUtils();

  const { data: isSyncing = false } = trpc.sync.isSyncing.useQuery(undefined, {
    refetchInterval: (query) => (query.state.data ? 2000 : 30000),
  });

  const syncMutation = trpc.sync.run.useMutation({
    onSuccess: async (result) => {
      await utils.manhwa.getAll.invalidate();
      if (!result || (result as any).startedAsync) {
        toast.info('🔄 Sync started in background.');
      } else {
        toast.success(`Sync finished: ${result.scannedSources} sources, ${result.newChapters} new chapters`);
      }
    },
    onError: (err) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleTrigger = (forceFullRefresh: boolean) => {
    onClose();
    syncMutation.mutate({ scope: 'all', forceFullRefresh });
  };

  const isPending = syncMutation.isPending || isSyncing;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-modal-backdrop"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-md bg-[#121316] border border-border/30 rounded-2xl shadow-2xl overflow-hidden my-auto p-5 sm:p-6 z-10 space-y-4 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isPending ? 'animate-spin' : ''}`} />
              <span>Choose Sync Mode</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Select how you want to check your sources for new chapters.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sync Mode Options */}
        <div className="space-y-3 pt-1">
          {/* Option 1: Smart Sync */}
          <button
            type="button"
            onClick={() => handleTrigger(false)}
            disabled={isPending}
            className="w-full text-left p-3.5 rounded-xl border border-border/40 hover:border-amber-500/50 bg-[#161719] hover:bg-[#1c1e22] transition-all group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                  <RefreshCw className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    Smart Sync
                  </h4>
                  <span className="text-[10px] text-amber-400/90 font-medium font-mono uppercase tracking-wider">
                    Recommended
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
              Checks sources due for new chapters based on their release schedule. Fast and light.
            </p>
          </button>

          {/* Option 2: Full Refresh (Force Check) */}
          <button
            type="button"
            onClick={() => handleTrigger(true)}
            disabled={isPending}
            className="w-full text-left p-3.5 rounded-xl border border-border/40 hover:border-orange-500/50 bg-[#161719] hover:bg-[#1c1e22] transition-all group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors">
                    Full Refresh
                  </h4>
                  <span className="text-[10px] text-orange-400/90 font-medium font-mono uppercase tracking-wider">
                    Manual Force Check
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
              Bypasses cadence and queries every single website and Telegram channel right now.
            </p>
          </button>
        </div>

        {/* Footer / Sync History Link */}
        {onOpenHistory && (
          <div className="pt-2 border-t border-border/20 flex items-center justify-between text-xs">
            <span className="text-zinc-500 text-[11px]">Want to see past results?</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenHistory();
              }}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>View Sync History</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

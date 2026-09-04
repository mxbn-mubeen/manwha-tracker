import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Loader2, CheckCircle2, Radio, RadioTower } from 'lucide-react';

export function SystemSection() {
  return (
    <div className="space-y-6">
      <SyncLockCard />
      <TelegramWatcherCard />
    </div>
  );
}

function SyncLockCard() {
  const utils = trpc.useUtils();
  const { data: isSyncing, isLoading } = trpc.sync.isSyncing.useQuery(undefined, {
    refetchInterval: 3000,
  });
  const { data: progress } = trpc.sync.getProgress.useQuery(undefined, {
    enabled: isSyncing === true,
    refetchInterval: isSyncing ? 3000 : false,
  });

  const clearLock = trpc.sync.clearLock.useMutation({
    onSuccess: async () => {
      await utils.sync.isSyncing.invalidate();
      await utils.sync.getProgress.invalidate();
      toast.success('Sync lock cleared', {
        description: 'The sync is no longer marked as running. You can start a new sync.',
      });
    },
    onError: (err) => toast.error('Failed to clear lock', { description: err.message }),
  });

  return (
    <div className="rounded-xl border border-border/20 bg-[#111214] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
            isSyncing
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-zinc-200">Sync Lock</h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              {isLoading
                ? 'Checking lock status...'
                : isSyncing
                  ? progress
                    ? `Sync in progress - ${progress.completed}/${progress.total} sources done`
                    : 'A sync is currently running (or stuck)'
                  : 'No sync is running - lock is clear'}
            </p>
          </div>
        </div>

        {isSyncing && (
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0 gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300"
            onClick={() => {
              if (confirm('Force-clear the sync lock?\n\nOnly do this if the sync is genuinely stuck (e.g. the worker was killed mid-run). If a sync is actually running, clearing the lock will cause duplicate runs.')) {
                clearLock.mutate();
              }
            }}
            disabled={clearLock.isPending}
          >
            {clearLock.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            Force Clear Lock
          </Button>
        )}
      </div>

      {isSyncing && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 text-xs text-amber-400/80">
          <strong className="text-amber-400">When to use Force Clear:</strong> If the sync bar has been stuck for more than 15 minutes and nothing is printing in the worker terminal, the process was likely killed. Click Force Clear to reset it.
        </div>
      )}
    </div>
  );
}

function TelegramWatcherCard() {
  const utils = trpc.useUtils();
  const { data: currentVal, isLoading } = trpc.settings.get.useQuery('START_TELEGRAM_WATCHER');
  const setMutation = trpc.settings.set.useMutation({
    onSuccess: async (_, vars) => {
      await utils.settings.get.invalidate('START_TELEGRAM_WATCHER');
      const enabled = vars.value === 'true';
      toast.success(enabled ? 'Telegram Watcher enabled' : 'Telegram Watcher disabled', {
        description: enabled
          ? 'The worker will start the Telegram watcher on next restart.'
          : 'The Telegram watcher will be skipped on next restart.',
      });
    },
    onError: (err) => toast.error('Failed to update setting', { description: err.message }),
  });

  const isEnabled = currentVal === 'true';
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const displayEnabled = optimistic !== null ? optimistic : isEnabled;

  function toggle() {
    const next = !displayEnabled;
    setOptimistic(next);
    setMutation.mutate(
      { key: 'START_TELEGRAM_WATCHER', value: next ? 'true' : 'false' },
      { onSettled: () => setOptimistic(null) },
    );
  }

  return (
    <div className="rounded-xl border border-border/20 bg-[#111214] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
            displayEnabled
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              : 'bg-zinc-800/60 border-border/20 text-zinc-500'
          }`}>
            {displayEnabled ? <RadioTower className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-zinc-200">Telegram Watcher</h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              {isLoading
                ? 'Loading...'
                : displayEnabled
                  ? 'Enabled - watcher will run on next worker restart'
                  : 'Disabled - watcher is skipped on startup'}
            </p>
          </div>
        </div>

        <button
          id="telegram-watcher-toggle"
          role="switch"
          aria-checked={displayEnabled}
          onClick={toggle}
          disabled={isLoading || setMutation.isPending}
          className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${
            displayEnabled ? 'bg-blue-500' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
              displayEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        Changes take effect on the next worker process restart. The watcher requires a valid Telegram session configured in the Telegram tab.
      </p>
    </div>
  );
}

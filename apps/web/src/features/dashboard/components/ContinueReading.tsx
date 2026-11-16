import { useState } from 'react';
import { CheckCircle2, BookOpen, CheckCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import type { RouterOutputs } from '@/lib/trpc';
import { ManhwaCard } from '@/features/manhwa/components/ManhwaCard';

type Manhwa = RouterOutputs['manhwa']['getAll'][number];

interface ContinueReadingProps {
  manhwas: Manhwa[];
  hasLibrary: boolean;
}

export function ContinueReading({ manhwas, hasLibrary }: ContinueReadingProps) {
  const utils = trpc.useUtils();
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const updateProgress = trpc.manhwa.updateProgress.useMutation();

  const handleMarkAllCaughtUp = async () => {
    if (manhwas.length === 0 || isMarkingAll) return;
    setIsMarkingAll(true);

    const count = manhwas.length;
    const targetUpdates = manhwas.map((m) => ({
      id: m.id,
      title: m.title,
      targetChapter: m.progress?.latestChapter ?? 0,
    }));

    // Optimistically update all in cache immediately
    await utils.manhwa.getAll.cancel();
    const previous = utils.manhwa.getAll.getData();

    utils.manhwa.getAll.setData(undefined, (old) => {
      if (!old) return old;
      const targetMap = new Map(targetUpdates.map((t) => [t.id, t.targetChapter]));
      return old.map((m) => {
        if (!targetMap.has(m.id)) return m;
        const targetChapter = targetMap.get(m.id)!;
        return {
          ...m,
          progress: {
            ...m.progress,
            lastChapter: targetChapter,
            latestChapter: m.progress?.latestChapter ?? targetChapter,
            lastReadAt: new Date(),
          },
        };
      });
    });

    try {
      await Promise.all(
        targetUpdates.map((u) =>
          updateProgress.mutateAsync({
            manhwaId: u.id,
            chapter: u.targetChapter,
          })
        )
      );
      toast.success(`Marked ${count} series as caught up`);
      utils.manhwa.getAll.invalidate(undefined, { refetchType: 'none' });
    } catch {
      toast.error('Failed to update some series');
      if (previous) {
        utils.manhwa.getAll.setData(undefined, previous);
      }
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Nothing to show either way if the library itself is empty — that's the
  // Library page's job to prompt for, not this section's.
  if (!hasLibrary) return null;

  if (manhwas.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Continue Reading</h2>
          <p className="text-sm text-muted-foreground">Pick up where you left off</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 p-8 flex flex-col items-center text-center gap-2">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-1">
            <CheckCircle2 size={22} />
          </div>
          <p className="font-semibold text-white">All caught up</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            No unread chapters across your library right now. Check back after next sync.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Continue Reading</h2>
          <p className="text-sm text-muted-foreground">Pick up where you left off</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleMarkAllCaughtUp}
            disabled={isMarkingAll}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 btn-press cursor-pointer disabled:opacity-50"
            title="Mark all unread series as caught up in 1 click"
          >
            {isMarkingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5" />
            )}
            <span>Mark all caught up</span>
          </button>

          <Link
            to="/library?filter=Unread"
            className="text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#161719] border border-border/20 hover:border-amber-500/30"
          >
            <span>View all unread</span>
            <BookOpen className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {manhwas.map((m, i) => (
          <div
            key={m.id}
            className="animate-card-enter"
            style={{ '--i': i } as React.CSSProperties}
          >
            <ManhwaCard manhwa={m} />
          </div>
        ))}
      </div>
    </div>
  );
}

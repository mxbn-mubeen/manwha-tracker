import { useState, useEffect } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface ChapterQuickEditProps {
  id: number;
  latestChapter: number;
}

export function ChapterQuickEdit({ id, latestChapter }: ChapterQuickEditProps) {
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [chapterInput, setChapterInput] = useState(String(latestChapter));
  const [optimisticChapter, setOptimisticChapter] = useState(latestChapter);
  const [loadingInc, setLoadingInc] = useState<number | null>(null);

  useEffect(() => {
    setOptimisticChapter(latestChapter);
  }, [latestChapter]);

  const updateLatestChapterMutation = trpc.manhwa.updateLatestChapter.useMutation({
    onSuccess: () => {
      utils.manhwa.getById.invalidate(id);
      utils.manhwa.getAll.invalidate();
      setIsEditing(false);
    },
    onError: (err) => toast.error(err.message || 'Failed to update latest chapter'),
  });

  const submitChapterEdit = () => {
    const parsed = Number(chapterInput);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Enter a valid chapter number');
      return;
    }
    setOptimisticChapter(parsed);
    updateLatestChapterMutation.mutate({ id, chapterNum: parsed });
  };

  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <span className="text-zinc-500 font-medium tracking-wide uppercase text-[10px]">Latest chapter</span>

      {isEditing ? (
        <div className="flex items-center gap-1.5 bg-[#161719] border border-amber-500/50 rounded-lg px-2 py-1">
          <input
            type="number"
            step="0.1"
            autoFocus
            value={chapterInput}
            onChange={(e) => setChapterInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitChapterEdit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="w-14 bg-transparent text-white font-mono text-xs outline-none"
          />
          <button
            type="button"
            onClick={submitChapterEdit}
            disabled={updateLatestChapterMutation.isPending}
            className="text-emerald-400 hover:text-emerald-300 p-0.5 transition-colors"
            aria-label="Save"
          >
            {updateLatestChapterMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-zinc-600 hover:text-white p-0.5 transition-colors"
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* Chapter number + edit pencil */}
          <button
            type="button"
            onClick={() => {
              setChapterInput(String(latestChapter));
              setIsEditing(true);
            }}
            className="flex items-center gap-1.5 group"
            title="Edit chapter number"
          >
            <span className="font-mono font-bold text-white text-sm tabular-nums">
              {optimisticChapter}
            </span>
            <Pencil className="h-3 w-3 text-zinc-600 group-hover:text-amber-400 transition-colors" />
          </button>

          {/* Divider */}
          <span className="text-zinc-700 select-none">·</span>

          {/* Quick-increment pills */}
          <div className="flex items-center gap-1">
            {[1, 2, 5].map((inc) => {
              const isThisLoading = updateLatestChapterMutation.isPending && loadingInc === inc;
              return (
                <button
                  key={inc}
                  type="button"
                  onClick={() => {
                    setLoadingInc(inc);
                    const next = optimisticChapter + inc;
                    setOptimisticChapter(next);
                    updateLatestChapterMutation.mutate({ id, chapterNum: next });
                  }}
                  disabled={updateLatestChapterMutation.isPending}
                  className="h-6 px-2 rounded-md text-[10px] font-bold font-mono bg-zinc-800 hover:bg-amber-500/20 border border-zinc-700 hover:border-amber-500/40 text-zinc-400 hover:text-amber-400 transition-all btn-press disabled:opacity-40 tabular-nums"
                  title={`Add ${inc} chapter`}
                >
                  {isThisLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : `+${inc}`}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


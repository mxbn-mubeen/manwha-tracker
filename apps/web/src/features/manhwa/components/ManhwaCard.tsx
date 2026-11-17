import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Plus, Check } from 'lucide-react';
import { cn, getUnreadCount, formatUnreadCount } from "@/lib/utils";
import { getProxiedImageUrl } from "@/utils/image";
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import type { RouterOutputs } from '@/lib/trpc';

type Manhwa = RouterOutputs['manhwa']['getAll'][number];

export function ManhwaCard({ manhwa }: { manhwa: Manhwa }) {
  const { data: session } = useSession();
  const [imgFailed, setImgFailed] = useState(false);
  const utils = trpc.useUtils();
  const user = session?.user;

  useEffect(() => {
    setImgFailed(false);
  }, [manhwa.coverUrl]);

  const unread = getUnreadCount(manhwa.progress?.latestChapter, manhwa.progress?.lastChapter);
  const currentChapter = manhwa.progress?.lastChapter ?? 0;
  const latestChapter = manhwa.progress?.latestChapter ?? 0;
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      (currentChapter / Math.max(1, latestChapter || 1)) * 100
    )
  );

  const readingSource =
    manhwa.sources?.find((s: { type?: string | null; url?: string | null }) => s.type === 'website' && s.url) ??
    manhwa.sources?.find((s: { url?: string | null }) => s.url) ??
    null;

  const updateProgressMutation = trpc.manhwa.updateProgress.useMutation({
    onMutate: async ({ manhwaId, chapter }) => {
      await utils.manhwa.getAll.cancel();
      const previous = utils.manhwa.getAll.getData();

      utils.manhwa.getAll.setData(undefined, (old) => {
        if (!old) return old;
        return old.map((m) => {
          if (m.id !== manhwaId) return m;
          return {
            ...m,
            progress: {
              ...m.progress,
              lastChapter: chapter,
              latestChapter: m.progress?.latestChapter ?? chapter,
              lastReadAt: new Date(),
            },
          };
        });
      });

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      toast.error('Failed to update progress');
      if (ctx?.previous) {
        utils.manhwa.getAll.setData(undefined, ctx.previous);
      }
    },
    onSuccess: (_data, vars) => {
      toast.success(`${manhwa.title} updated to Ch. ${vars.chapter}`);
      utils.manhwa.getAll.invalidate(undefined, { refetchType: 'none' });
    },
  });

  const handleAdvance = (targetChapter: number) => {
    const clamped = Math.min(Math.max(0, targetChapter), latestChapter || targetChapter);
    updateProgressMutation.mutate({
      manhwaId: manhwa.id,
      chapter: clamped,
    });
  };

  return (
    <div className="relative group/card aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 border border-border/50 transition-all hover:border-amber-500/50 hover:glow card-hover-lift">
      <Link
        to={`/manhwa/${manhwa.id}`}
        className="absolute inset-0 block z-0"
        aria-label={`View details for ${manhwa.title}`}
      >
        {manhwa.coverUrl && !imgFailed ? (
          <img
            src={getProxiedImageUrl(manhwa.coverUrl) as string}
            alt={manhwa.title}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600 text-xs font-medium">
            NO COVER
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      </Link>

      {/* Unread Badge (Top Right) — only for logged in user */}
      {user && unread > 0 && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <Badge className="bg-amber-500 text-amber-950 font-bold border-none shadow-md">
            +{formatUnreadCount(unread)}
          </Badge>
        </div>
      )}

      {/* Quick Action Overlay (Center-hover on desktop, always accessible on touch) — only for logged in user */}
      {user && unread > 0 && (
        <div className="absolute inset-x-2 bottom-15 z-20 flex items-center justify-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover/card:opacity-100 transition-all duration-200 pointer-events-auto">
          {readingSource?.url && (
            <a
              href={readingSource.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="h-7 px-2 rounded-lg bg-black/80 hover:bg-black text-[11px] font-semibold text-zinc-200 hover:text-white border border-white/20 backdrop-blur-md flex items-center gap-1 transition-transform hover:scale-105 active:scale-95 shadow-md"
              title="Open source to read"
            >
              <ExternalLink className="w-3 h-3 text-amber-400" />
              <span>Read</span>
            </a>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdvance(currentChapter + 1);
            }}
            className="h-7 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[11px] font-bold border border-amber-400/50 backdrop-blur-md flex items-center gap-1 transition-transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
            title={`Mark Ch. ${currentChapter + 1} read (+1)`}
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>1</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdvance(latestChapter);
            }}
            className="h-7 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-bold border border-emerald-400/50 backdrop-blur-md flex items-center gap-1 transition-transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
            title={`Mark all unread caught up (Ch. ${latestChapter})`}
          >
            <Check className="w-3 h-3 stroke-[3]" />
            <span>All</span>
          </button>
        </div>
      )}

      {/* Card Footer Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10 pointer-events-none">
        <h3 className="font-semibold text-sm line-clamp-1 mb-1 text-white">{manhwa.title}</h3>
        {user ? (
          <>
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Ch. {currentChapter}</span>
              <span>/ {latestChapter}</span>
            </div>
            <div className="mt-2 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </>
        ) : (
          <div className="text-xs text-zinc-400">
            <span>Latest: Ch. {latestChapter}</span>
          </div>
        )}
      </div>
    </div>
  );
}
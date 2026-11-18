import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Plus, Check, BookmarkPlus } from 'lucide-react';
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

  const isTracking = manhwa.progress?.isTracking ?? false;
  const unread = isTracking ? getUnreadCount(manhwa.progress?.latestChapter, manhwa.progress?.lastChapter) : 0;
  const currentChapter = manhwa.progress?.lastChapter ?? 0;
  const latestChapter = manhwa.progress?.latestChapter ?? 0;
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      (currentChapter / Math.max(1, latestChapter || 1)) * 100
    )
  );

  // Always pick the leading website source (highest synced chapter count)
  const readingSource =
    manhwa.sources
      ?.filter((s: { type?: string | null; url?: string | null }) => s.type === 'website' && s.url)
      ?.sort((a: any, b: any) => (b.lastSyncedChapter ?? 0) - (a.lastSyncedChapter ?? 0))[0] ??
    manhwa.sources?.find((s: { url?: string | null }) => s.url) ??
    null;

  const startTrackingMutation = trpc.manhwa.startTracking.useMutation({
    onMutate: async () => {
      await utils.manhwa.getAll.cancel();
      const previous = utils.manhwa.getAll.getData();

      utils.manhwa.getAll.setData(undefined, (old) => {
        if (!old) return old;
        return old.map((m) => {
          if (m.id !== manhwa.id) return m;
          return {
            ...m,
            progress: {
              ...m.progress,
              isTracking: true,
              status: 'reading',
              lastChapter: m.progress?.lastChapter ?? 0,
              latestChapter: m.progress?.latestChapter ?? 0,
            },
          };
        });
      });

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      toast.error('Failed to add to reading list');
      if (ctx?.previous) {
        utils.manhwa.getAll.setData(undefined, ctx.previous);
      }
    },
    onSuccess: () => {
      toast.success(`Added ${manhwa.title} to your reading list!`);
      utils.manhwa.getAll.invalidate(undefined, { refetchType: 'none' });
    },
  });

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
              isTracking: true,
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

      {/* Unread Badge (Top Right) — only for logged in user tracking this */}
      {user && isTracking && unread > 0 && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <Badge className="bg-amber-500 text-amber-950 font-bold border-none shadow-md">
            +{formatUnreadCount(unread)}
          </Badge>
        </div>
      )}

      {/* Quick Action Overlay for tracking users (Option 2: Compact Read + All with comfortable spacing above title) */}
      {user && isTracking && unread > 0 && (
        <div className="absolute inset-x-2 bottom-18 sm:bottom-18 z-20 flex items-center justify-center gap-2 opacity-90 sm:opacity-0 sm:group-hover/card:opacity-100 transition-all duration-200 pointer-events-auto">
          {readingSource?.url && (
            <a
              href={readingSource.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="h-6 px-2.5 rounded-lg bg-black/85 hover:bg-black text-[10px] font-bold text-zinc-100 hover:text-white border border-white/20 backdrop-blur-md flex items-center gap-1.5 transition-transform hover:scale-105 active:scale-95 shadow-md"
              title="Open source to read"
            >
              <ExternalLink className="w-2.5 h-2.5 text-amber-400" />
              <span>Read</span>
            </a>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAdvance(latestChapter);
            }}
            className="h-6 px-2.5 rounded-lg bg-emerald-500/90 hover:bg-emerald-400 text-zinc-950 text-[10px] font-extrabold border border-emerald-400/40 backdrop-blur-md flex items-center gap-1 transition-transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
            title={`Mark all unread caught up (Ch. ${latestChapter})`}
          >
            <Check className="w-2.5 h-2.5 stroke-[3]" />
            <span>All</span>
          </button>
        </div>
      )}

      {/* Start Tracking CTA overlay for logged-in users NOT yet tracking this manhwa */}
      {user && !isTracking && (
        <div className="absolute inset-x-3 bottom-14 z-20 flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover/card:opacity-100 transition-all duration-200 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startTrackingMutation.mutate({ manhwaId: manhwa.id });
            }}
            disabled={startTrackingMutation.isPending}
            className="w-full h-8 rounded-xl bg-amber-500/95 hover:bg-amber-400 text-zinc-950 text-xs font-bold border border-amber-400/60 backdrop-blur-md flex items-center justify-center gap-1.5 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Track</span>
          </button>
        </div>
      )}

      {/* Card Footer Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10 pointer-events-none">
        <h3 className="font-semibold text-sm line-clamp-1 mb-1 text-white">{manhwa.title}</h3>
        {user && isTracking ? (
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
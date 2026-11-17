import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, Plus, Check } from "lucide-react";
import { cn, getUnreadCount, formatUnreadCount } from "@/lib/utils";
import { getProxiedImageUrl } from "@/utils/image";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { RouterOutputs } from "@/lib/trpc";

type Manhwa = RouterOutputs["manhwa"]["getAll"][number];

export function ManhwaCard({ manhwa }: { manhwa: Manhwa }) {
  const navigate = useNavigate();
  const [imgFailed, setImgFailed] = useState(false);
  const utils = trpc.useUtils();

  useEffect(() => {
    setImgFailed(false);
  }, [manhwa.coverUrl]);

  const unread = getUnreadCount(
    manhwa.progress?.latestChapter,
    manhwa.progress?.lastChapter,
  );
  const currentChapter = manhwa.progress?.lastChapter ?? 0;
  const latestChapter = manhwa.progress?.latestChapter ?? 0;
  const progressPercent = Math.min(
    100,
    Math.max(0, (currentChapter / Math.max(1, latestChapter || 1)) * 100),
  );

  const readingSource =
    manhwa.sources?.find(
      (s: { type?: string | null; url?: string | null }) =>
        s.type === "website" && s.url,
    ) ??
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
      toast.error("Failed to update progress");
      if (ctx?.previous) {
        utils.manhwa.getAll.setData(undefined, ctx.previous);
      }
    },
    onSuccess: (_data, vars) => {
      toast.success(`${manhwa.title} updated to Ch. ${vars.chapter}`);
      utils.manhwa.getAll.invalidate(undefined, { refetchType: "none" });
    },
  });

  const handleAdvance = (targetChapter: number) => {
    const clamped = Math.min(
      Math.max(0, targetChapter),
      latestChapter || targetChapter,
    );
    updateProgressMutation.mutate({
      manhwaId: manhwa.id,
      chapter: clamped,
    });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) {
      return;
    }
    navigate(`/manhwa/${manhwa.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="relative group/card aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 border border-border/50 transition-all hover:border-amber-500/50 hover:glow card-hover-lift cursor-pointer"
    >
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 via-40% to-black/10" />
      </Link>

      {/* Unread Badge (Top Right) */}
      {unread > 0 && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <div className="bg-black/85 backdrop-blur-md border border-amber-500/40 px-2.5 py-0.5 rounded-full shadow-lg shadow-black/40">
            <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5 font-mono">
              +{formatUnreadCount(unread)}
            </span>
          </div>
        </div>
      )}

      {/* Card Footer Info with Integrated Docked Quick Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 z-10 flex flex-col justify-end bg-gradient-to-t from-black via-black/90 to-transparent pt-8">
        <h3 className="font-semibold text-xs sm:text-sm line-clamp-1 mb-0.5 text-white drop-shadow-sm pointer-events-none">
          {manhwa.title}
        </h3>

        <div className="flex items-center justify-between text-[11px] sm:text-xs text-zinc-400 pointer-events-none mb-1.5">
          <span>Ch. {currentChapter}</span>
          <span>/ {latestChapter}</span>
        </div>

        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden pointer-events-none mb-2">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Docked Action Bar: Only when unread > 0 */}
        {unread > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5 pointer-events-auto">
            {readingSource?.url && (
              <a
                href={readingSource.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-6.5 px-2 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-amber-400 border border-white/15 backdrop-blur-sm flex items-center justify-center transition-colors text-[10px] font-semibold gap-1 shrink-0"
                title="Open reader"
                aria-label="Open source reader"
              >
                <ExternalLink className="w-3 h-3 text-amber-400" />
                <span className="text-[10px]">Read</span>
              </a>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdvance(currentChapter + 1);
              }}
              className="h-6.5 flex-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/35 backdrop-blur-sm text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-0.5 shadow-sm cursor-pointer transition-all active:scale-95"
              title={`Mark Ch. ${currentChapter + 1} read (+1)`}
            >
              <Plus className="w-2.5 h-2.5 stroke-[3]" />
              <span>1</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdvance(latestChapter);
              }}
              className="h-6.5 flex-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 backdrop-blur-sm text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-0.5 shadow-sm cursor-pointer transition-all active:scale-95"
              title={`Mark all unread caught up (Ch. ${latestChapter})`}
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>All</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

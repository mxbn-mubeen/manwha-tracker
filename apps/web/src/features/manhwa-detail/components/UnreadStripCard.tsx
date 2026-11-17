import { Link, useNavigate } from "react-router-dom";
import { Plus, Check, ExternalLink } from "lucide-react";
import { getUnreadCount, formatUnreadCount } from "@/lib/utils";
import { ManhwaCoverImage } from "@/features/sources/components/ManhwaCoverImage";
import type { RouterOutputs } from "@/lib/trpc";

type Manhwa = RouterOutputs["manhwa"]["getAll"][number];

interface UnreadStripCardProps {
  manhwa: Manhwa;
  onAdvance: (manhwaId: number, targetChapter: number, latest: number) => void;
}

export function UnreadStripCard({ manhwa, onAdvance }: UnreadStripCardProps) {
  const latest = manhwa.progress?.latestChapter ?? 0;
  const last = manhwa.progress?.lastChapter ?? 0;
  const behind = getUnreadCount(latest, last);
  const progressPercent =
    latest > 0 ? Math.min(100, Math.max(0, (last / latest) * 100)) : 0;
  const navigate = useNavigate();
  const readingSource =
    manhwa.sources?.find(
      (s: { type?: string | null; url?: string | null }) =>
        s.type === "website" && s.url,
    ) ??
    manhwa.sources?.find((s: { url?: string | null }) => s.url) ??
    null;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) {
      return;
    }
    navigate(`/manhwa/${manhwa.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group/strip relative flex flex-col min-w-[150px] sm:min-w-[170px] max-w-[195px] flex-1 bg-[#161719]/70 hover:bg-[#161719] border border-border/20 hover:border-amber-500/40 rounded-xl p-3 transition-all duration-200 card-hover-lift shrink-0 snap-start cursor-pointer"
    >
      <Link
        to={`/manhwa/${manhwa.id}`}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`View ${manhwa.title}`}
      />

      {/* Cover Art with Badge */}
      <div className="relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 border border-white/5 mb-2.5">
        <ManhwaCoverImage
          src={manhwa.coverUrl}
          alt={manhwa.title}
          className="w-full h-full object-cover group-hover/strip:scale-105 transition-transform duration-300 pointer-events-none"
        />

        {/* Unread Chapter Pill Badge */}
        <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md border border-amber-500/40 px-2 py-0.5 rounded-full shadow-lg shadow-black/40 pointer-events-none">
          <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5 font-mono">
            +{formatUnreadCount(behind)}
          </span>
        </div>

        {/* Docked Action Bar at bottom of cover */}
        {behind > 0 && (
          <div className="absolute inset-x-1.5 bottom-1.5 z-10 flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover/strip:opacity-100 transition-all duration-200 pointer-events-auto">
            {readingSource?.url && (
              <a
                href={readingSource.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="h-6 px-1.5 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-amber-400 border border-white/10 flex items-center justify-center transition-colors text-[10px] font-semibold gap-1 shrink-0"
                title="Open reader"
                aria-label="Open source reader"
              >
                <ExternalLink className="w-2.5 h-2.5 text-amber-400" />
                <span className="text-[10px]">Read</span>
              </a>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdvance(manhwa.id, last + 1, latest);
              }}
              className="h-6 flex-1 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-bold border border-amber-400/50 flex items-center justify-center gap-0.5 shadow-sm cursor-pointer transition-transform active:scale-95"
              title={`Mark Ch. ${last + 1} read`}
            >
              <Plus className="w-2.5 h-2.5 stroke-[3]" />
              <span>1</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdvance(manhwa.id, latest, latest);
              }}
              className="h-6 flex-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[10px] font-bold border border-emerald-400/50 flex items-center justify-center gap-0.5 shadow-sm cursor-pointer transition-transform active:scale-95"
              title={`Mark caught up (Ch. ${latest})`}
            >
              <Check className="w-2.5 h-2.5 stroke-[3]" />
              <span>All</span>
            </button>
          </div>
        )}
      </div>

      {/* Title & Metadata */}
      <div className="flex-1 flex flex-col justify-between min-w-0 pointer-events-none">
        <div>
          <h3
            className="text-xs sm:text-sm font-semibold text-white group-hover/strip:text-amber-300 transition-colors line-clamp-2 leading-snug mb-1"
            title={manhwa.title}
          >
            {manhwa.title}
          </h3>
        </div>

        <div className="mt-2 space-y-1.5">
          {/* Miniature Progress Track */}
          <div className="w-full bg-zinc-800/80 rounded-full h-1 overflow-hidden border border-white/5">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>Ch. {last}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">{latest || "?"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

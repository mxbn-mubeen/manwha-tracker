import { Edit, BookOpen, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ManhwaCoverImage } from '@/features/sources/components/ManhwaCoverImage';

interface ManhwaPosterProps {
  coverUrl: string | null;
  title: string;
  localChapter: number;
  latestChapter: number;
  onContinueReading: () => void;
  onEdit: () => void;
}

export function ManhwaPoster({
  coverUrl,
  title,
  localChapter,
  latestChapter,
  onContinueReading,
  onEdit,
}: ManhwaPosterProps) {
  const isCaughtUp = latestChapter > 0 && localChapter >= latestChapter;

  return (
    <div className="shrink-0 mx-auto md:mx-0 w-60 sm:w-64 flex flex-col gap-3">
      {/* ── Poster Card ── */}
      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-[#111214] border border-border/30 shadow-2xl relative group">
        <ManhwaCoverImage
          src={coverUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        {isCaughtUp && (
          <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md border border-emerald-500/40 text-emerald-400 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Caught up</span>
          </div>
        )}
      </div>

      {/* ── Continue Reading Primary CTA Button ── */}
      <Button
        type="button"
        className={
          isCaughtUp
            ? 'w-full bg-[#161719] text-zinc-500 font-semibold shadow-none h-11 rounded-xl cursor-default hover:bg-[#161719] border border-border/20 text-xs'
            : 'w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/20 active:scale-98 h-11 rounded-xl transition-all btn-press text-xs sm:text-sm'
        }
        onClick={onContinueReading}
        disabled={isCaughtUp}
      >
        <div className="flex items-center justify-center gap-2">
          {isCaughtUp ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>All Caught Up</span>
            </>
          ) : (
            <>
              <BookOpen className="w-4 h-4 stroke-[2.5]" />
              <span>Continue Ch. {localChapter + 1}</span>
            </>
          )}
        </div>
      </Button>

      {/* ── Edit Manhwa Action Button ── */}
      <button
        type="button"
        onClick={onEdit}
        className="w-full flex items-center justify-center gap-2 bg-[#161719] hover:bg-[#202225] border border-border/25 hover:border-amber-500/30 text-zinc-300 hover:text-white rounded-xl h-10 font-semibold text-xs transition-all btn-press"
      >
        <Edit className="h-3.5 w-3.5 text-zinc-400" />
        <span>Edit Manhwa</span>
      </button>
    </div>
  );
}

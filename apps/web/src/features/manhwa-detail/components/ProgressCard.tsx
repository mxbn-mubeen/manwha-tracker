import { ChevronDown, ChevronUp, CheckCircle2, BookmarkCheck } from 'lucide-react';
import { getUnreadCount, formatUnreadCount } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ProgressCardProps {
  localChapter: number;
  latestChapter: number;
  status: string;
  onProgressChange: (newChapter: number) => void;
  isPending: boolean;
}

export function ProgressCard({
  localChapter,
  latestChapter,
  status,
  onProgressChange,
  isPending,
}: ProgressCardProps) {
  const unread = getUnreadCount(latestChapter, localChapter);

  const progressPercent = Math.min(
    100,
    Math.max(0, (localChapter / Math.max(1, latestChapter)) * 100)
  );

  const isCaughtUp = unread === 0 && latestChapter > 0;
  const hideStepper =
    isCaughtUp && ['completed', 'hiatus', 'dropped'].includes(status);

  return (
    <div className="bg-[#111214] border border-border/20 p-5 sm:p-6 rounded-2xl shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookmarkCheck className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Reading Progress
          </h3>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-border/20 text-zinc-400">
          {Math.round(progressPercent)}% read
        </span>
      </div>

      <div className="flex flex-col gap-5">
        {/* Metric & Stepper Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {localChapter}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-zinc-500 font-mono">
              / {latestChapter || '?'}
            </span>
            <span className="text-xs text-zinc-500 font-normal ml-1">chapters</span>
          </div>

          {!hideStepper ? (
            <div className="flex items-center gap-2 bg-[#161719] px-2 py-1.5 rounded-xl border border-border/20 shadow-inner">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors btn-press"
                onClick={() => onProgressChange(localChapter - 1)}
                disabled={localChapter <= 0 || isPending}
                aria-label="Decrease chapter"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>

              <div className="w-8 text-center font-mono font-bold text-sm text-white">
                {localChapter}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors btn-press"
                onClick={() => onProgressChange(localChapter + 1)}
                disabled={isPending || (latestChapter > 0 && localChapter >= latestChapter)}
                aria-label="Increase chapter"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Caught up</span>
            </div>
          )}
        </div>

        {/* Progress Track & Status */}
        <div className="space-y-2.5">
          <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCaughtUp ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-xs">
            <div className={`font-medium flex items-center gap-1.5 ${isCaughtUp ? 'text-emerald-400' : 'text-amber-400'}`}>
              {unread > 0 ? (
                <span>
                  {formatUnreadCount(unread)} new {unread === 1 ? 'chapter' : 'chapters'} available
                </span>
              ) : (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> All caught up with latest release!
                </span>
              )}
            </div>

            {unread > 0 && (
              <button
                type="button"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                onClick={() => onProgressChange(latestChapter)}
                disabled={isPending}
              >
                Mark as caught up
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

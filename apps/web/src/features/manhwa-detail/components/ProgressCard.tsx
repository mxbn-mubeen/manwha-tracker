import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, BookmarkCheck, BookmarkX } from 'lucide-react';
import { getUnreadCount, formatUnreadCount } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ProgressCardProps {
  localChapter: number;
  latestChapter: number;
  status: string;
  userStatus?: string;
  onProgressChange: (newChapter: number) => void;
  onStatusChange?: (status: 'reading' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_read') => void;
  onStopTracking?: () => void;
  isPending: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  reading: 'Reading',
  plan_to_read: 'Plan to Read',
  on_hold: 'On Hold',
  completed: 'Completed',
  dropped: 'Dropped',
};

const STATUS_CLASSES: Record<string, string> = {
  reading: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  plan_to_read: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  on_hold: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  completed: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  dropped: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export function ProgressCard({
  localChapter,
  latestChapter,
  status,
  userStatus = 'reading',
  onProgressChange,
  onStatusChange,
  onStopTracking,
  isPending,
}: ProgressCardProps) {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

        <div className="flex items-center gap-2">
          {/* Personal Reading Status Dropdown */}
          {onStatusChange && (
            <div className="relative" ref={statusRef}>
              <button
                type="button"
                onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 btn-press cursor-pointer ${
                  STATUS_CLASSES[userStatus] ?? 'text-zinc-400 bg-white/5 border-border/20'
                }`}
                title="Change your personal reading status"
              >
                <span>{STATUS_LABELS[userStatus] ?? 'Reading'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {statusMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-[#161719] border border-border/40 rounded-xl shadow-2xl py-1 z-50 overflow-hidden backdrop-blur-xl animate-card-enter">
                  {(['reading', 'plan_to_read', 'on_hold', 'completed', 'dropped'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        onStatusChange(s);
                        setStatusMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-white/5 transition-colors flex items-center justify-between ${
                        s === userStatus ? 'text-amber-400 font-bold' : 'text-zinc-300'
                      }`}
                    >
                      <span>{STATUS_LABELS[s]}</span>
                      {s === userStatus && <span className="text-amber-400 text-xs">✓</span>}
                    </button>
                  ))}
                  {onStopTracking && (
                    <div className="border-t border-border/20 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onStopTracking();
                          setStatusMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <BookmarkX className="w-3.5 h-3.5" />
                        <span>Untrack</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-border/20 text-zinc-400">
            {Math.round(progressPercent)}% read
          </span>
        </div>
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
                disabled={localChapter <= 0}
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
                disabled={latestChapter > 0 && localChapter >= latestChapter}
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

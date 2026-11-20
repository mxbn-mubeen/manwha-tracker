import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, BookmarkCheck, BookmarkX, PauseCircle, XCircle, Sparkles } from 'lucide-react';
import { getUnreadCount } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  STATUS_LABELS,
  STATUS_CLASSES,
  getProgressTheme,
  ProgressStatusFooter,
} from './progress-card.utils';

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

export function ProgressCard({
  localChapter,
  latestChapter,
  status,
  userStatus = 'reading',
  onProgressChange,
  onStatusChange,
  onStopTracking,
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

  const theme = getProgressTheme(userStatus);

  const showCompletedNudge =
    isCaughtUp &&
    status === 'completed' &&
    userStatus !== 'completed' &&
    !!onStatusChange;

  return (
    <div className={`border p-5 sm:p-6 rounded-2xl shadow-sm space-y-5 transition-all duration-300 ${theme.containerClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookmarkCheck className={`w-4 h-4 transition-colors ${theme.headerIconClass}`} />
          <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
            Reading Progress
          </h3>
        </div>

        <div className="flex items-center gap-2">
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

          {userStatus === 'completed' ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 shadow-sm shadow-purple-500/10">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Completed</span>
            </div>
          ) : userStatus === 'dropped' ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400">
              <XCircle className="w-3.5 h-3.5" />
              <span>Dropped</span>
            </div>
          ) : userStatus === 'on_hold' ? (
            <div className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
              <PauseCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>On Hold</span>
            </div>
          ) : !hideStepper ? (
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

        {/* Progress Track */}
        <div className="space-y-2.5">
          <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                userStatus === 'reading'
                  ? isCaughtUp
                    ? 'bg-emerald-500'
                    : 'bg-emerald-500/80'
                  : theme.progressBarClass
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <ProgressStatusFooter
            userStatus={userStatus}
            isCaughtUp={isCaughtUp}
            unread={unread}
            localChapter={localChapter}
            latestChapter={latestChapter}
            onMarkCaughtUp={() => onProgressChange(latestChapter)}
            onResumeReading={() => onStatusChange?.('reading')}
          />
        </div>

        {/* Nudge: series finished + user caught up but not yet marked completed */}
        {showCompletedNudge && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25">
            <div className="flex items-center gap-2 text-xs text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>This series has ended and you're all caught up — mark it as Completed?</span>
            </div>
            <button
              type="button"
              onClick={() => onStatusChange!('completed')}
              className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 transition-colors cursor-pointer"
            >
              Mark Completed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

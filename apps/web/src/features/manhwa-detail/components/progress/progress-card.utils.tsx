import React from 'react';
import {
  CheckCircle2,
  PauseCircle,
  XCircle,
  BookMarked,
  Trophy,
} from 'lucide-react';
import { formatUnreadCount } from '@/lib/utils';

export const STATUS_LABELS: Record<string, string> = {
  reading: 'Reading',
  plan_to_read: 'Plan to Read',
  on_hold: 'On Hold',
  completed: 'Completed',
  dropped: 'Dropped',
};

export const STATUS_CLASSES: Record<string, string> = {
  reading: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  plan_to_read: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  on_hold: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  completed: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  dropped: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export interface ProgressTheme {
  containerClass: string;
  headerIconClass: string;
  progressBarClass: string;
}

export function getProgressTheme(userStatus: string): ProgressTheme {
  switch (userStatus) {
    case 'completed':
      return {
        containerClass:
          'bg-gradient-to-b from-purple-950/25 via-[#111214] to-[#111214] border-purple-500/35 shadow-[0_0_24px_-8px_rgba(168,85,247,0.15)]',
        headerIconClass: 'text-purple-400',
        progressBarClass:
          'bg-gradient-to-r from-purple-500 to-indigo-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]',
      };
    case 'on_hold':
      return {
        containerClass:
          'bg-gradient-to-b from-cyan-950/20 via-[#111214] to-[#111214] border-cyan-500/30 shadow-[0_0_20px_-8px_rgba(6,182,212,0.15)]',
        headerIconClass: 'text-cyan-400',
        progressBarClass: 'bg-cyan-500/80',
      };
    case 'dropped':
      return {
        containerClass:
          'bg-gradient-to-b from-red-950/25 via-[#111214] to-[#111214] border-red-500/35 shadow-[0_0_20px_-8px_rgba(239,68,68,0.15)]',
        headerIconClass: 'text-red-400',
        progressBarClass: 'bg-red-500/50',
      };
    case 'plan_to_read':
      return {
        containerClass:
          'bg-gradient-to-b from-blue-950/20 via-[#111214] to-[#111214] border-blue-500/30',
        headerIconClass: 'text-blue-400',
        progressBarClass: 'bg-blue-500/80',
      };
    default:
      return {
        containerClass: 'bg-[#111214] border-emerald-500/20',
        headerIconClass: 'text-emerald-400',
        progressBarClass: 'bg-emerald-500',
      };
  }
}

interface StatusFooterProps {
  userStatus: string;
  isCaughtUp: boolean;
  unread: number;
  localChapter: number;
  latestChapter: number;
  onMarkCaughtUp: () => void;
  onResumeReading?: () => void;
}

export function ProgressStatusFooter({
  userStatus,
  isCaughtUp,
  unread,
  localChapter,
  latestChapter,
  onMarkCaughtUp,
  onResumeReading,
}: StatusFooterProps) {
  if (userStatus === 'completed') {
    return (
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-purple-300 font-semibold">
          <Trophy className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>You finished reading this series!</span>
        </span>
        {unread > 0 && (
          <button
            type="button"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 hover:underline transition-colors cursor-pointer"
            onClick={onMarkCaughtUp}
          >
            Update to Ch. {latestChapter}
          </button>
        )}
      </div>
    );
  }

  if (userStatus === 'dropped') {
    return (
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-red-400 font-medium">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Dropped at Chapter {localChapter} (Not tracking releases)</span>
        </div>
        {onResumeReading && (
          <button
            type="button"
            onClick={onResumeReading}
            className="text-[11px] font-semibold text-red-400 hover:text-red-300 hover:underline transition-colors cursor-pointer"
          >
            Resume reading
          </button>
        )}
      </div>
    );
  }

  if (userStatus === 'on_hold') {
    return (
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
          <PauseCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Reading paused at Chapter {localChapter}</span>
        </span>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <span className="text-zinc-500 text-[11px]">
              {formatUnreadCount(unread)} new unread
            </span>
          )}
          {onResumeReading && (
            <button
              type="button"
              onClick={onResumeReading}
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
            >
              Resume
            </button>
          )}
        </div>
      </div>
    );
  }

  if (userStatus === 'plan_to_read') {
    return (
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-1.5 text-blue-400 font-medium">
          <BookMarked className="w-3.5 h-3.5 shrink-0" />
          <span>Plan to Read — {latestChapter || 0} chapters available</span>
        </span>
        {onResumeReading && (
          <button
            type="button"
            onClick={onResumeReading}
            className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 hover:underline transition-colors cursor-pointer"
          >
            Start reading
          </button>
        )}
      </div>
    );
  }

  // userStatus === 'reading' (default)
  return (
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
          onClick={onMarkCaughtUp}
        >
          Mark as caught up
        </button>
      )}
    </div>
  );
}

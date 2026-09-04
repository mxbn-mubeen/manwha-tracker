import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { trpc } from '@/lib/trpc';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import type { SyncRun, SyncSourceRow } from '@manhwa-tracker/shared';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { RunCard } from './RunCard';

// ─── Main drawer ───────────────────────────────────────────────────────────────

interface SyncHistoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SyncHistoryDrawer({ open, onClose }: SyncHistoryDrawerProps) {
  const { data: history = [] } = trpc.sync.getHistory.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  return (
    <Sheet open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-4xl bg-[#0d0e10] border-border/30 flex flex-col"
      >
        <SheetHeader className="pb-4 border-b border-border/20">
          <SheetTitle className="text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            Sync History
          </SheetTitle>
        </SheetHeader>

        <div 
          className="flex-1 overflow-y-auto py-4 pr-1 space-y-3 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-600 gap-2">
              <Clock className="h-8 w-8 opacity-30" />
              <p className="text-sm">No syncs yet this session.</p>
              <p className="text-xs opacity-60">Run a sync to see results here.</p>
            </div>
          ) : (
            history.map((run, i) => <RunCard key={i} run={run as SyncRun} onClose={onClose} />)
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
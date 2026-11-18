import { useState, useMemo } from 'react';
import {
  Clock,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import type { SyncRun, SyncSourceRow } from '@manhwa-tracker/shared';
import { trpc } from '@/lib/trpc';
import { search as utilsSearch } from '@manhwa-tracker/utils';
import { formatRelative, formatDuration } from './run-card.utils';
import { RunRowItem } from './components/RunRowItem';
import { RunGroupItem, type ManhwaSyncGroup } from './components/RunGroupItem';
import { SyncManhwaCard } from './components/SyncManhwaCard';
import { RunControlsBar } from './components/RunControlsBar';

const PAGE_SIZE = 50;

export function RunCard({ run, onClose }: { run: SyncRun; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'new' | 'unchanged' | 'issues' | 'errors' | 'skipped'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'grouped' | 'compact'>('cards');
  const [search, setSearch] = useState('');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Cached manhwa query for cover thumbnails
  const { data: allManhwas = [] } = trpc.manhwa.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const coverMap = useMemo(() => {
    const map = new Map<number, string | null>();
    for (const m of allManhwas) {
      map.set(m.id, m.coverUrl);
    }
    return map;
  }, [allManhwas]);

  const newCount = run.rows.filter((r: SyncSourceRow) => r.status === 'new').length;
  const unchangedCount = run.rows.filter((r: SyncSourceRow) => r.status === 'no_new').length;
  const issueCount = run.rows.filter((r: SyncSourceRow) => r.status === 'issue' || r.status === 'failed' || Boolean(r.reason)).length;
  const skippedCount = run.rows.filter((r: SyncSourceRow) => r.status === 'skipped').length;
  const runErrors = run.errors ?? [];

  const searchResults = useMemo(() => {
    if (!search.trim()) return run.rows;
    return utilsSearch(run.rows, search.trim(), {
      fields: [
        { key: 'manhwaTitle', weight: 1 },
        { key: 'source', weight: 0.6 },
        { key: 'reason', weight: 0.3 },
      ],
    });
  }, [run.rows, search]);

  const filteredRows = useMemo(() => {
    return searchResults.filter((r: SyncSourceRow) => {
      if (filter === 'new') return r.status === 'new';
      if (filter === 'unchanged') return r.status === 'no_new';
      if (filter === 'issues') return r.status === 'issue' || r.status === 'failed' || Boolean(r.reason);
      if (filter === 'skipped') return r.status === 'skipped';
      return true;
    });
  }, [searchResults, filter]);

  // Group filtered rows by manhwaId for Grouped & Cards views
  const groupedManhwas = useMemo(() => {
    const map = new Map<number, ManhwaSyncGroup>();
    for (const row of filteredRows) {
      if (!map.has(row.manhwaId)) {
        map.set(row.manhwaId, {
          manhwaId: row.manhwaId,
          manhwaTitle: row.manhwaTitle,
          coverUrl: coverMap.get(row.manhwaId) ?? null,
          rows: [],
          hasNew: false,
          hasIssue: false,
        });
      }
      const group = map.get(row.manhwaId)!;
      group.rows.push(row);
      if (row.status === 'new') group.hasNew = true;
      if (row.status === 'issue' || row.status === 'failed' || Boolean(row.reason)) group.hasIssue = true;
    }
    return Array.from(map.values());
  }, [filteredRows, coverMap]);

  const displayedRows = filteredRows.slice(0, displayCount);
  const displayedGroups = groupedManhwas.slice(0, displayCount);

  return (
    <div className="bg-[#111214] border border-border/20 rounded-2xl overflow-hidden transition-all shadow-sm">
      {/* Header Row — Clickable to expand */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left hover:bg-white/[0.02] transition-colors gap-3 cursor-pointer"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span className="font-mono">{formatRelative(run.startedAt)}</span>
          </div>

          <span className="text-zinc-600">·</span>

          {run.newChapters > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              {run.newChapters} new
            </span>
          ) : (
            <span className="text-[11px] text-zinc-500 bg-white/5 border border-border/10 px-2 py-0.5 rounded-full">
              No new chapters
            </span>
          )}

          {issueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
            </span>
          )}

          {runErrors.length > 0 && (
            <span className="text-[11px] font-semibold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full">
              {runErrors.length} errors
            </span>
          )}

          <span className="text-zinc-600">·</span>
          <span className="text-zinc-500 capitalize">{run.triggeredBy}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-500 font-mono text-xs">{formatDuration(run.duration)}</span>
        </div>

        <div className="shrink-0 text-zinc-500">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded Content Area */}
      {open && (
        <div className="border-t border-border/20 bg-[#161719]/40 animate-panel-expand">
          <RunControlsBar
            run={run}
            filter={filter}
            setFilter={setFilter}
            viewMode={viewMode}
            setViewMode={setViewMode}
            search={search}
            setSearch={setSearch}
            onResetDisplayCount={() => setDisplayCount(PAGE_SIZE)}
            newCount={newCount}
            unchangedCount={unchangedCount}
            issueCount={issueCount}
            skippedCount={skippedCount}
            runErrorsCount={runErrors.length}
          />

          {/* Errors Section if viewing errors */}
          {filter === 'errors' && runErrors.length > 0 && (
            <div className="p-3 bg-red-950/20 border-b border-red-900/30 space-y-2">
              <p className="text-xs font-semibold text-red-400">Run Errors ({runErrors.length})</p>
              <div className="space-y-1">
                {runErrors.map((err: string, i: number) => (
                  <p key={i} className="text-xs font-mono text-red-300 bg-red-950/40 p-2 rounded border border-red-900/30">
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* List Content */}
          <div className="p-3 sm:p-4">
            {filteredRows.length === 0 ? (
              <p className="text-center text-xs text-zinc-500 py-6">
                {search ? 'No results matching search' : 'No entries for this filter'}
              </p>
            ) : viewMode === 'cards' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayedGroups.map((group) => (
                  <SyncManhwaCard key={group.manhwaId} group={group} onClose={onClose} />
                ))}
              </div>
            ) : viewMode === 'grouped' ? (
              <div className="space-y-2">
                {displayedGroups.map((group) => (
                  <RunGroupItem key={group.manhwaId} group={group} onClose={onClose} />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {displayedRows.map((row: SyncSourceRow, idx: number) => (
                  <RunRowItem key={`${row.manhwaId}-${row.source}-${idx}`} row={row} onClose={onClose} />
                ))}
              </div>
            )}

            {/* Load More Button */}
            {((viewMode === 'compact' && filteredRows.length > displayCount) ||
              (viewMode !== 'compact' && groupedManhwas.length > displayCount)) && (
              <div className="text-center pt-3">
                <button
                  onClick={() => setDisplayCount((prev) => prev + PAGE_SIZE)}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[#161719] hover:bg-white/5 border border-border/20 text-zinc-400 hover:text-white transition-all"
                >
                  Load More ({viewMode === 'compact' ? filteredRows.length - displayCount : groupedManhwas.length - displayCount} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
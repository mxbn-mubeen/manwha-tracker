import { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { SyncRun, SyncSourceRow } from '@manhwa-tracker/shared';
import { trpc } from '@/lib/trpc';
import { search as utilsSearch } from '@manhwa-tracker/utils';
import {
  RunRowItem,
  RunGroupItem,
  type ManhwaSyncGroup,
  SyncManhwaCard,
  RunCardControls,
  type RunFilter,
  type RunViewMode,
  RunCardHeader,
} from './components';

const PAGE_SIZE = 50;

export function RunCard({ run, onClose }: { run: SyncRun; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<RunFilter>('all');
  const [viewMode, setViewMode] = useState<RunViewMode>('cards');
  const [search, setSearch] = useState('');
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

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
      if (filter === 'all') return true;
      if (filter === 'new') return r.status === 'new';
      if (filter === 'unchanged') return r.status === 'no_new';
      if (filter === 'issues') return r.status === 'issue' || r.status === 'failed' || Boolean(r.reason);
      if (filter === 'skipped') return r.status === 'skipped';
      return true;
    });
  }, [searchResults, filter]);

  const manhwaGroups = useMemo(() => {
    const map = new Map<string, ManhwaSyncGroup>();
    for (const r of filteredRows) {
      const key = `${r.manhwaId || '0'}-${r.manhwaTitle}`;
      if (!map.has(key)) {
        map.set(key, {
          manhwaId: r.manhwaId,
          manhwaTitle: r.manhwaTitle,
          rows: [],
          hasNew: false,
          hasIssue: false,
        });
      }
      const g = map.get(key)!;
      g.rows.push(r);
      if (r.status === 'new') g.hasNew = true;
      if (r.status === 'issue' || r.status === 'failed' || Boolean(r.reason)) g.hasIssue = true;
    }
    return Array.from(map.values());
  }, [filteredRows]);

  const visibleRows = filteredRows.slice(0, displayCount);
  const visibleGroups = manhwaGroups.slice(0, displayCount);

  return (
    <div className="border border-border/20 rounded-xl overflow-hidden bg-[#111214] transition-all shadow-sm">
      {/* Header Bar */}
      <RunCardHeader
        run={run}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        newCount={newCount}
        issueCount={issueCount}
        errorCount={runErrors.length}
      />

      {/* Expanded Content Area */}
      {open && (
        <div className="border-t border-border/20 bg-[#161719]/40 animate-panel-expand">
          <RunCardControls
            filter={filter}
            onFilterChange={(f) => { setFilter(f); setDisplayCount(PAGE_SIZE); }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            search={search}
            onSearchChange={(s) => { setSearch(s); setDisplayCount(PAGE_SIZE); }}
            totalRows={run.rows.length}
            newCount={newCount}
            unchangedCount={unchangedCount}
            issueCount={issueCount}
            skippedCount={skippedCount}
            errorCount={runErrors.length}
          />

          {/* Incomplete / Interrupted Empty State */}
          {run.rows.length === 0 && filter !== 'errors' ? (
            <div className="p-8 text-center text-xs text-zinc-400 space-y-1.5">
              <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="font-semibold text-zinc-200">No source history captured for this run.</p>
              <p className="text-zinc-500 max-w-md mx-auto">
                {run.status === 'running'
                  ? 'This sync was terminated before completing (e.g. runner 25m timeout reached). Soft-timeout protection is now active to prevent this.'
                  : 'No sources were recorded for this sync run.'}
              </p>
            </div>
          ) : filter === 'errors' ? (
            <div className="p-4 space-y-2">
              {runErrors.map((err: string, i: number) => (
                <div key={i} className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-3 break-words font-mono">
                  {err}
                </div>
              ))}
            </div>
          ) : viewMode === 'cards' ? (
            /* Cards View (Default) */
            <div className="p-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {visibleGroups.map((group) => (
                  <SyncManhwaCard
                    key={`${group.manhwaId}-${group.manhwaTitle}`}
                    group={group}
                    coverUrl={coverMap.get(group.manhwaId) ?? null}
                    onClose={onClose}
                  />
                ))}
              </div>
              {manhwaGroups.length === 0 && (
                <div className="px-4 py-10 text-center text-xs text-zinc-500">
                  No manhwa match your current filter.
                </div>
              )}
            </div>
          ) : viewMode === 'grouped' ? (
            /* Grouped List View */
            <div className="p-3 space-y-2">
              {visibleGroups.map((group) => (
                <RunGroupItem key={`${group.manhwaId}-${group.manhwaTitle}`} group={group} onClose={onClose} />
              ))}
              {manhwaGroups.length === 0 && (
                <div className="px-4 py-10 text-center text-xs text-zinc-500">
                  No manhwa match your current filter.
                </div>
              )}
            </div>
          ) : (
            /* Compact List View */
            <div className="divide-y divide-border/10">
              {visibleRows.map((row: SyncSourceRow, i: number) => (
                <RunRowItem key={i} row={row} index={i} onClose={onClose} />
              ))}
              {filteredRows.length === 0 && (
                <div className="px-4 py-10 text-center text-xs text-zinc-500">
                  No sources match your current filter.
                </div>
              )}
            </div>
          )}

          {/* Load More Button */}
          {((viewMode === 'compact' && filteredRows.length > displayCount) ||
            (viewMode !== 'compact' && manhwaGroups.length > displayCount)) && (
            <div className="p-3 text-center border-t border-border/10 bg-[#161719]/40">
              <button
                onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-4 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-all btn-press cursor-pointer"
              >
                Load next {PAGE_SIZE} items
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

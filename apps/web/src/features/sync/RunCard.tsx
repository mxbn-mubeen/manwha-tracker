import { useState, useMemo } from 'react';
import {
  Clock,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Search,
  LayoutGrid,
  Layers,
  List,
} from 'lucide-react';
import type { SyncRun, SyncSourceRow } from '@manhwa-tracker/shared';
import { trpc } from '@/lib/trpc';
import { search as utilsSearch } from '@manhwa-tracker/utils';
import { formatRelative, formatDuration } from './run-card.utils';
import { RunRowItem } from './components/RunRowItem';
import { RunGroupItem, type ManhwaSyncGroup } from './components/RunGroupItem';
import { SyncManhwaCard } from './components/SyncManhwaCard';

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
      if (filter === 'all') return true;
      if (filter === 'new') return r.status === 'new';
      if (filter === 'unchanged') return r.status === 'no_new';
      if (filter === 'issues') return r.status === 'issue' || r.status === 'failed' || Boolean(r.reason);
      if (filter === 'skipped') return r.status === 'skipped';
      return true;
    });
  }, [searchResults, filter]);

  // Group filtered rows by manhwa
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
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-white">
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            {formatRelative(run.runAt)}
          </span>

          <span className="text-zinc-600">·</span>
          <span className="text-zinc-400">{run.scannedSources} sources</span>

          {newCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              {newCount} new
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
          {/* Controls Bar: Tabs, View Toggle & Search */}
          <div className="flex items-center justify-between gap-2.5 px-3 sm:px-4 py-2 border-b border-border/10 bg-[#161719] flex-wrap">
            <div className="flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
              <button
                onClick={() => { setFilter('all'); setDisplayCount(PAGE_SIZE); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-amber-500 text-amber-950 font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                All ({run.rows.length})
              </button>

              <button
                onClick={() => { setFilter('new'); setDisplayCount(PAGE_SIZE); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  filter === 'new'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                    : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                New ({newCount})
              </button>

              <button
                onClick={() => { setFilter('unchanged'); setDisplayCount(PAGE_SIZE); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  filter === 'unchanged'
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Unchanged ({unchangedCount})
              </button>

              <button
                onClick={() => { setFilter('issues'); setDisplayCount(PAGE_SIZE); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  filter === 'issues'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                    : 'text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                Issues ({issueCount})
              </button>

              {skippedCount > 0 && (
                <button
                  onClick={() => { setFilter('skipped'); setDisplayCount(PAGE_SIZE); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    filter === 'skipped'
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Skipped ({skippedCount})
                </button>
              )}

              {runErrors.length > 0 && (
                <button
                  onClick={() => { setFilter('errors'); setDisplayCount(PAGE_SIZE); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    filter === 'errors'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-semibold'
                      : 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  Errors ({runErrors.length})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {/* 3-Way View Switcher: Cards vs Grouped vs Compact */}
              <div className="flex items-center bg-[#111214] border border-border/20 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                    viewMode === 'cards' ? 'bg-amber-500 text-amber-950 font-semibold' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Card Grid"
                >
                  <LayoutGrid className="w-3 h-3" />
                  <span className="hidden sm:inline">Cards</span>
                </button>

                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                    viewMode === 'grouped' ? 'bg-amber-500 text-amber-950 font-semibold' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Grouped by Manhwa"
                >
                  <Layers className="w-3 h-3" />
                  <span className="hidden sm:inline">Grouped</span>
                </button>

                <button
                  onClick={() => setViewMode('compact')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                    viewMode === 'compact' ? 'bg-amber-500 text-amber-950 font-semibold' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Compact List"
                >
                  <List className="w-3 h-3" />
                  <span className="hidden sm:inline">Compact</span>
                </button>
              </div>

              {/* Quick Search Bar */}
              <div className="relative shrink-0 w-36 sm:w-44">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setDisplayCount(PAGE_SIZE); }}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1 rounded-lg text-xs bg-[#111214] border border-border/30 text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Errors View */}
          {filter === 'errors' ? (
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
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-4 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 transition-all btn-press"
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

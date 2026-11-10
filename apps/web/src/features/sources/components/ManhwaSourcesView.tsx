import { useState, useMemo } from 'react';
import { LayoutGrid, List as ListIcon, AlertCircle, ArrowUpDown } from 'lucide-react';
import { ManhwaSourcesCardGrid } from './ManhwaSourcesCardGrid';
import { ManhwaSourceListRow } from './ManhwaSourceListRow';
import { ManageSourcesModal } from './ManageSourcesModal';

export interface SourceItem {
  id: number;
  manhwaId: number;
  manhwaTitle: string;
  manhwaCover: string | null;
  type: 'telegram' | 'website' | string;
  url: string;
  adapterKey: string;
  isActive: boolean | null;
}

export interface ManhwaGroup {
  manhwaId: number;
  manhwaTitle: string;
  manhwaCover: string | null;
  sources: SourceItem[];
}

type SortOption = 'title' | 'most-sources' | 'single-source';

export function ManhwaSourcesView({ sources }: { sources: SourceItem[] }) {
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [modalGroup, setModalGroup] = useState<ManhwaGroup | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('title');

  // Group sources by manhwaId
  const rawGroups = useMemo(() => {
    const map = new Map<number, ManhwaGroup>();
    for (const s of sources) {
      if (!map.has(s.manhwaId)) {
        map.set(s.manhwaId, {
          manhwaId: s.manhwaId,
          manhwaTitle: s.manhwaTitle,
          manhwaCover: s.manhwaCover,
          sources: [],
        });
      }
      map.get(s.manhwaId)!.sources.push(s);
    }
    return Array.from(map.values());
  }, [sources]);

  // Sort groups based on user selection
  const groups = useMemo(() => {
    const list = [...rawGroups];
    if (sortBy === 'most-sources') {
      return list.sort((a, b) => b.sources.length - a.sources.length);
    }
    if (sortBy === 'single-source') {
      return list.sort((a, b) => a.sources.length - b.sources.length);
    }
    return list.sort((a, b) => a.manhwaTitle.localeCompare(b.manhwaTitle));
  }, [rawGroups, sortBy]);

  const singleSourceCount = useMemo(
    () => rawGroups.filter((g) => g.sources.length === 1).length,
    [rawGroups]
  );

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(groups.map((g) => g.manhwaId)));
  const collapseAll = () => setExpandedIds(new Set());

  if (groups.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 border border-border/20 rounded-xl bg-[#111214] animate-fade-up">
        No manhwas found matching your filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View control bar: Counts, quick filters, and layout switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-400 px-1">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-medium text-zinc-300">
            {groups.length} {groups.length === 1 ? 'title' : 'titles'}
          </span>

          {singleSourceCount > 0 && (
            <button
              onClick={() => setSortBy(sortBy === 'single-source' ? 'title' : 'single-source')}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
                sortBy === 'single-source'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                  : 'bg-white/5 border-border/30 text-zinc-400 hover:text-amber-400'
              }`}
              title="Click to sort by single-source titles first"
            >
              <AlertCircle className="w-3 h-3 text-amber-400" />
              <span>{singleSourceCount} single-source</span>
            </button>
          )}

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 bg-[#161719] border border-border/20 px-2 py-1 rounded-md">
            <ArrowUpDown className="w-3 h-3 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="title" className="bg-[#161719]">A to Z</option>
              <option value="most-sources" className="bg-[#161719]">Most Sources</option>
              <option value="single-source" className="bg-[#161719]">Fewest Sources</option>
            </select>
          </div>

          {layout === 'list' && (
            <div className="flex items-center gap-2 text-zinc-500 pl-1">
              <button
                onClick={expandAll}
                className="hover:text-zinc-300 transition-colors underline"
              >
                Expand all
              </button>
              <span>·</span>
              <button
                onClick={collapseAll}
                className="hover:text-zinc-300 transition-colors underline"
              >
                Collapse all
              </button>
            </div>
          )}
        </div>

        {/* Layout toggle buttons */}
        <div className="flex items-center bg-[#161719] border border-border/20 p-1 rounded-lg gap-1 shrink-0 self-end sm:self-auto">
          <button
            onClick={() => setLayout('grid')}
            title="Card Grid (Library style)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all btn-press ${
              layout === 'grid'
                ? 'bg-amber-500 text-amber-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Card Grid</span>
          </button>
          <button
            onClick={() => setLayout('list')}
            title="List Rows"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all btn-press ${
              layout === 'list'
                ? 'bg-amber-500 text-amber-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span>List Rows</span>
          </button>
        </div>
      </div>

      {/* Main Content: Card Grid vs List Rows */}
      {layout === 'grid' ? (
        <ManhwaSourcesCardGrid groups={groups} />
      ) : (
        <div className="space-y-3">
          {groups.map((group, groupIdx) => (
            <ManhwaSourceListRow
              key={group.manhwaId}
              group={group}
              index={groupIdx}
              isExpanded={expandedIds.has(group.manhwaId)}
              onToggleExpand={() => toggleExpand(group.manhwaId)}
              onOpenManageModal={() => setModalGroup(group)}
            />
          ))}
        </div>
      )}

      {/* Global Manage Modal (when triggered from List view) */}
      {modalGroup && (
        <ManageSourcesModal
          group={modalGroup}
          onClose={() => setModalGroup(null)}
        />
      )}
    </div>
  );
}

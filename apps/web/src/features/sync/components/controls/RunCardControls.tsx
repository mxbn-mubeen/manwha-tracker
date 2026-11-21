import React from 'react';
import { Search, LayoutGrid, Layers, List } from 'lucide-react';

export type RunFilter = 'all' | 'new' | 'unchanged' | 'issues' | 'errors' | 'skipped';
export type RunViewMode = 'cards' | 'grouped' | 'compact';

interface RunCardControlsProps {
  filter: RunFilter;
  onFilterChange: (f: RunFilter) => void;
  viewMode: RunViewMode;
  onViewModeChange: (m: RunViewMode) => void;
  search: string;
  onSearchChange: (s: string) => void;
  totalRows: number;
  newCount: number;
  unchangedCount: number;
  issueCount: number;
  skippedCount: number;
  errorCount: number;
}

export function RunCardControls({
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
  totalRows,
  newCount,
  unchangedCount,
  issueCount,
  skippedCount,
  errorCount,
}: RunCardControlsProps) {
  return (
    <div className="flex items-center justify-between gap-2.5 px-3 sm:px-4 py-2 border-b border-border/10 bg-[#161719] flex-wrap">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-amber-500 text-amber-950 font-semibold'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          All ({totalRows})
        </button>

        <button
          onClick={() => onFilterChange('new')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            filter === 'new'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
              : 'text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10'
          }`}
        >
          New ({newCount})
        </button>

        <button
          onClick={() => onFilterChange('unchanged')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            filter === 'unchanged'
              ? 'bg-white/10 text-white font-semibold'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Unchanged ({unchangedCount})
        </button>

        <button
          onClick={() => onFilterChange('issues')}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            filter === 'issues'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
              : 'text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10'
          }`}
        >
          Issues ({issueCount})
        </button>

        {skippedCount > 0 && (
          <button
            onClick={() => onFilterChange('skipped')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filter === 'skipped'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Skipped ({skippedCount})
          </button>
        )}

        {errorCount > 0 && (
          <button
            onClick={() => onFilterChange('errors')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filter === 'errors'
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-semibold'
                : 'text-zinc-400 hover:text-red-400 hover:bg-red-500/10'
            }`}
          >
            Errors ({errorCount})
          </button>
        )}
      </div>

      {/* View Switcher & Search Bar */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <div className="flex items-center bg-[#111214] border border-border/20 p-0.5 rounded-lg text-xs">
          <button
            onClick={() => onViewModeChange('cards')}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'cards' ? 'bg-amber-500 text-amber-950 font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
            title="Card Grid"
          >
            <LayoutGrid className="w-3 h-3" />
            <span className="hidden sm:inline">Cards</span>
          </button>

          <button
            onClick={() => onViewModeChange('grouped')}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'grouped' ? 'bg-amber-500 text-amber-950 font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
            title="Grouped by Manhwa"
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">Grouped</span>
          </button>

          <button
            onClick={() => onViewModeChange('compact')}
            className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer ${
              viewMode === 'compact' ? 'bg-amber-500 text-amber-950 font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
            title="Compact List"
          >
            <List className="w-3 h-3" />
            <span className="hidden sm:inline">Compact</span>
          </button>
        </div>

        <div className="relative shrink-0 w-36 sm:w-44">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1 rounded-lg text-xs bg-[#111214] border border-border/30 text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>
    </div>
  );
}

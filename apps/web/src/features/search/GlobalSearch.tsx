import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Search, X, ArrowRight, CornerDownLeft } from 'lucide-react';
import { search } from '@manhwa-tracker/utils';
import { getUnreadCount, formatUnreadCount } from '@/lib/utils';
import { ManhwaCoverImage } from '@/features/sources/components/ManhwaCoverImage';
import { SearchQuickNav, NAV_PAGES } from './components/SearchQuickNav';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: all = [] } = trpc.manhwa.getAll.useQuery();

  // Search results
  const matchingPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return NAV_PAGES.filter(p => p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
  }, [query]);

  const matchingManhwa = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return search(all, q, {
      fields: [
        { key: 'title', weight: 1 },
        { key: 'genres', weight: 0.5, isArray: true },
        { key: 'id', weight: 0.3 },
      ],
      limit: 7,
    });
  }, [all, query]);

  // When query is empty, show continue reading suggestions
  const suggestions = useMemo(() => {
    return all
      .filter(m => {
        if (m.status === 'completed') return false;
        return getUnreadCount(m.progress?.latestChapter, m.progress?.lastChapter) > 0;
      })
      .slice(0, 4);
  }, [all]);

  // Combined selectable list for arrow key navigation
  const selectableItems = useMemo(() => {
    if (query.trim()) {
      return [
        ...matchingPages.map(p => ({ type: 'page' as const, path: p.path })),
        ...matchingManhwa.map(m => ({ type: 'manhwa' as const, id: m.id })),
      ];
    }
    return [
      ...NAV_PAGES.slice(0, 3).map(p => ({ type: 'page' as const, path: p.path })),
      ...suggestions.map(m => ({ type: 'manhwa' as const, id: m.id })),
    ];
  }, [query, matchingPages, matchingManhwa, suggestions]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, Math.max(0, selectableItems.length - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = selectableItems[selectedIndex];
        if (selected) {
          if (selected.type === 'page') navigate(selected.path);
          else navigate(`/manhwa/${selected.id}`);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, navigate, selectableItems, selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-4 animate-modal-backdrop"
      onPointerDown={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-2xl bg-[#111214] border border-border/30 rounded-2xl shadow-2xl overflow-hidden animate-modal-content flex flex-col max-h-[75vh]"
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/20 bg-[#161719]/50">
          <Search className="h-4 w-4 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search titles, genres, or jump to page..."
            className="flex-1 bg-transparent text-white placeholder:text-zinc-500 text-sm outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-zinc-500 bg-white/5 border border-border/30 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-3 custom-scrollbar">
          {query.trim() ? (
            <>
              {/* Matching Navigation Pages */}
              {matchingPages.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 py-1">
                    Navigation
                  </p>
                  <div className="space-y-1">
                    {matchingPages.map((p, idx) => {
                      const isSelected = selectedIndex === idx;
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.path}
                          onClick={() => { navigate(p.path); onClose(); }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                            isSelected ? 'bg-amber-500/15 text-white border border-amber-500/30' : 'hover:bg-white/5 text-zinc-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-amber-400">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{p.title}</p>
                              <p className="text-xs text-zinc-500">{p.desc}</p>
                            </div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Matching Manhwas */}
              {matchingManhwa.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 py-1">
                    Manhwa Series ({matchingManhwa.length})
                  </p>
                  <ul className="space-y-1">
                    {matchingManhwa.map((m, idx) => {
                      const itemIdx = matchingPages.length + idx;
                      const isSelected = selectedIndex === itemIdx;
                      const behind = getUnreadCount(m.progress?.latestChapter, m.progress?.lastChapter);

                      return (
                        <li key={m.id}>
                          <button
                            onClick={() => { navigate(`/manhwa/${m.id}`); onClose(); }}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                              isSelected ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <div className="h-11 w-8 rounded overflow-hidden bg-zinc-900 border border-border/30 shrink-0">
                              <ManhwaCoverImage src={m.coverUrl} alt={m.title} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                                {m.title}
                              </p>
                              <p className="text-xs text-zinc-400 mt-0.5">
                                Ch. {m.progress?.lastChapter ?? 0} / {m.progress?.latestChapter ?? '?'}
                                {behind > 0 && (
                                  <span className="ml-2 text-amber-400 font-medium">+{formatUnreadCount(behind)} unread</span>
                                )}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/30 text-zinc-400 bg-white/5 font-mono">
                                #{m.id}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {matchingPages.length === 0 && matchingManhwa.length === 0 && (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No manhwa or pages matching <span className="text-white">"{query}"</span>
                </div>
              )}
            </>
          ) : (
            <SearchQuickNav
              selectedIndex={selectedIndex}
              suggestions={suggestions}
              onSelect={onClose}
            />
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="border-t border-border/20 px-4 py-2 bg-[#161719]/40 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 bg-white/5 border border-border/30 rounded font-mono text-[10px]">↑</kbd>
              <kbd className="px-1 py-0.2 bg-white/5 border border-border/30 rounded font-mono text-[10px]">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 bg-white/5 border border-border/30 rounded font-mono text-[10px] flex items-center">
                <CornerDownLeft className="w-2.5 h-2.5 inline" />
              </kbd>
              <span>to select</span>
            </span>
          </div>
          <span>Esc to exit</span>
        </div>
      </div>
    </div>
  );
}

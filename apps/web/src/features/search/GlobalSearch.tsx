import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Search, X, CornerDownLeft } from 'lucide-react';
import { search } from '@manhwa-tracker/utils';
import { getUnreadCount } from '@/lib/utils';
import { SearchQuickNav, NAV_PAGES } from './components/SearchQuickNav';
import { SearchResultsList } from './components/SearchResultsList';
import { useSession } from '@/lib/auth-client';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = (user as any)?.role === 'admin';

  const { data: all = [] } = trpc.manhwa.getAll.useQuery();

  // Pages accessible to the current user (stats require login, admin pages require admin)
  const availablePages = useMemo(() => {
    return NAV_PAGES.filter(p => {
      if (p.adminOnly && !isAdmin) return false;
      if (p.userOnly && !user) return false;
      return true;
    });
  }, [user, isAdmin]);

  // Search results
  const matchingPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return availablePages.filter(p => p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
  }, [query, availablePages]);

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

  const suggestions = useMemo(() => {
    if (user) {
      const readingWithUnread = all.filter(m => {
        if (!m.progress?.isTracking) return false;
        const behind = getUnreadCount(m.progress?.latestChapter, m.progress?.lastChapter);
        return behind > 0;
      });
      if (readingWithUnread.length > 0) {
        return readingWithUnread.slice(0, 4);
      }
    }
    return all.slice(0, 4);
  }, [all, user]);

  const totalResults = query.trim()
    ? matchingPages.length + matchingManhwa.length
    : suggestions.length + availablePages.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, totalResults));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalResults) % Math.max(1, totalResults));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (query.trim()) {
          const page = matchingPages[selectedIndex];
          if (page) {
            navigate(page.path);
            onClose();
          } else {
            const m = matchingManhwa[selectedIndex - matchingPages.length];
            if (m) {
              navigate(`/manhwa/${m.id}`);
              onClose();
            }
          }
        } else {
          const sugg = suggestions[selectedIndex];
          if (sugg) {
            navigate(`/manhwa/${sugg.id}`);
            onClose();
          } else {
            const page = availablePages[selectedIndex - suggestions.length];
            if (page) {
              navigate(page.path);
              onClose();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, totalResults, selectedIndex, query, matchingPages, matchingManhwa, suggestions, availablePages, navigate, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-2xl bg-[#0f1012] border border-border/40 shadow-2xl overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

        {/* Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/20 bg-[#161719]/60">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search manhwa by title, genre, ID, or jump to page…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block text-[10px] uppercase font-mono font-bold text-zinc-500 bg-white/5 border border-border/30 px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          )}
        </div>

        {/* Body Content */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {query.trim() ? (
            <SearchResultsList
              query={query}
              matchingPages={matchingPages}
              matchingManhwa={matchingManhwa}
              selectedIndex={selectedIndex}
              user={user}
              onClose={onClose}
            />
          ) : (
            <SearchQuickNav
              selectedIndex={selectedIndex}
              suggestions={suggestions}
              pages={availablePages}
              isLoggedIn={!!user}
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
    </div>,
    document.body
  );
}

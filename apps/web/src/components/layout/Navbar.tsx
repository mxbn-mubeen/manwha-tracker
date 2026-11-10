import { Link, useLocation } from 'react-router-dom';
import { Plus, Settings, History, Search, Globe, BarChart3, Library } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SyncHistoryDrawer } from '@/features/sync/SyncHistoryDrawer';
import { GlobalSearch } from '@/features/search/GlobalSearch';
import { Logo } from './Logo';
import { SyncSplitButton } from './SyncSplitButton';

export function Navbar() {
  const location = useLocation();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd+K / Ctrl+K opens global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex h-16 items-center px-3 sm:px-6 lg:px-8 justify-between gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* ── Left Side: Logo & Main Navigation Capsule ── */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <Link to="/dashboard" className="shrink-0">
              <Logo />
            </Link>

            <nav className="flex items-center bg-[#111214]/90 border border-border/30 p-1 rounded-xl backdrop-blur-md shadow-inner gap-1 text-sm font-medium shrink-0">
              <Link
                to="/dashboard"
                className={`transition-all duration-200 px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs sm:text-sm shrink-0 btn-press ${
                  location.pathname === '/dashboard'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10 font-semibold animate-bubble'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <span className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5 shrink-0">
                  <div className="bg-current rounded-[1px]" />
                  <div className="bg-current rounded-[1px]" />
                  <div className="bg-current rounded-[1px]" />
                  <div className="bg-current rounded-[1px]" />
                </span>
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              <Link
                to="/library"
                className={`transition-all duration-200 px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs sm:text-sm shrink-0 btn-press ${
                  location.pathname === '/library'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10 font-semibold animate-bubble'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <Library className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Library</span>
              </Link>

              <Link
                to="/sources"
                className={`transition-all duration-200 px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs sm:text-sm shrink-0 btn-press ${
                  location.pathname === '/sources'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10 font-semibold animate-bubble'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <Globe className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Sources</span>
              </Link>

              <Link
                to="/stats"
                className={`transition-all duration-200 px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs sm:text-sm shrink-0 btn-press ${
                  location.pathname === '/stats'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10 font-semibold animate-bubble'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Stats</span>
              </Link>
            </nav>
          </div>

          {/* ── Right Side: Search, Tool Controls Capsule & Action ── */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Search Pill Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 bg-[#111214]/90 hover:bg-[#161719] border border-border/30 hover:border-amber-500/40 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white transition-all shadow-inner btn-press group"
              title="Search (⌘K)"
            >
              <Search className="h-3.5 w-3.5 text-zinc-400 group-hover:text-amber-400 transition-colors shrink-0" />
              <span className="hidden md:inline text-zinc-400 group-hover:text-zinc-200">Search</span>
              <span className="hidden md:inline text-[10px] text-zinc-500 bg-white/5 border border-border/40 rounded px-1.5 py-0.2 font-mono">
                ⌘K
              </span>
            </button>

            {/* Tools Capsule Container */}
            <div className="flex items-center bg-[#111214]/90 border border-border/30 p-1 rounded-xl backdrop-blur-md shadow-inner gap-1 shrink-0">
              {/* Sync History Drawer Trigger */}
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all btn-press"
                title="Sync history"
              >
                <History className="h-4 w-4 shrink-0" />
              </button>

              {/* Sync Action Split Button */}
              <SyncSplitButton />

              {/* Settings Page Link */}
              <Link
                to="/settings"
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all btn-press ${
                  location.pathname === '/settings'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10 font-semibold animate-bubble'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
                title="Settings"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4 shrink-0" />
              </Link>
            </div>

            {/* Primary Action Button */}
            <Link
              to="/add"
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition-all btn-press shrink-0"
            >
              <Plus className="h-4 w-4 stroke-[2.75]" />
              <span className="hidden sm:inline whitespace-nowrap">Add Manhwa</span>
            </Link>
          </div>
        </div>
      </header>

      <SyncHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

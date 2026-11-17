import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, ShieldCheck, BarChart3, Globe, Settings, Plus, RefreshCw, History } from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';
import { toast } from 'sonner';
import { AuthModal } from '@/features/auth/AuthModal';
import { trpc } from '@/lib/trpc';

export function UserMenu({ onOpenHistory }: { onOpenHistory?: () => void }) {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: isSyncing = false } = trpc.sync.isSyncing.useQuery(undefined, {
    refetchInterval: (query) => (query.state.data ? 2000 : 30000),
  });

  const syncMutation = trpc.sync.run.useMutation({
    onSuccess: async (result) => {
      await utils.manhwa.getAll.invalidate();
      if (!result || (result as any).startedAsync) {
        toast.info('🔄 Sync started in background.');
      } else {
        toast.success(`Sync finished: ${result.scannedSources} sources, ${result.newChapters} new chapters`);
      }
    },
    onError: (err) => {
      toast.error(`Sync failed: ${err.message}`);
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    try {
      localStorage.removeItem('manhwa_user_id');
      await signOut();
      toast.success('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const user = session?.user;

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="flex items-center gap-1.5 bg-[#111214]/90 hover:bg-[#161719] border border-border/30 hover:border-amber-500/40 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-inner btn-press shrink-0 cursor-pointer"
        >
          <LogIn className="w-3.5 h-3.5 text-amber-400" />
          <span>Sign In</span>
        </button>

        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    );
  }

  const isAdmin = (user as any).role === 'admin';
  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setDropdownOpen((o) => !o)}
        className="flex items-center gap-2 bg-[#111214]/90 hover:bg-[#161719] border border-border/30 hover:border-amber-500/40 p-1 sm:px-2 sm:py-1 rounded-xl transition-all shadow-inner btn-press cursor-pointer"
        aria-label="User menu"
      >
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
          {initial}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-semibold text-white leading-tight max-w-[100px] truncate">
            {user.name}
          </span>
          {isAdmin && (
            <span className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider">
              ADMIN
            </span>
          )}
        </div>
      </button>

      {/* User Dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#111214] border border-border/30 p-2 shadow-2xl z-50 animate-scale-up space-y-1">
          <div className="px-3 py-2 border-b border-border/15">
            <p className="text-xs font-bold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            {isAdmin && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <ShieldCheck className="w-3 h-3" />
                <span>ADMINISTRATOR</span>
              </div>
            )}
          </div>

          <div className="py-1 border-b border-border/15">
            <Link
              to="/stats"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Analytics & Stats</span>
            </Link>

            {isAdmin && (
              <>
                <Link
                  to="/sources"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sources Manager</span>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  <span>Settings & Bot</span>
                </Link>

                <Link
                  to="/add"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Manhwa</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    syncMutation.mutate({ scope: 'all', forceFullRefresh: false });
                  }}
                  disabled={syncMutation.isPending || isSyncing}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${syncMutation.isPending || isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync All Sources</span>
                  </div>
                  {isSyncing && (
                    <span className="text-[10px] text-amber-400 font-mono">Syncing...</span>
                  )}
                </button>

                {onOpenHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenHistory();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sync History</span>
                  </button>
                )}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

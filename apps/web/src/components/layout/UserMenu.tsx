import { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';
import { toast } from 'sonner';
import { AuthModal } from '@/features/auth/AuthModal';

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      await signOut();
      toast.success('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  if (isPending) {
    return (
      <div className="w-8 h-8 rounded-xl bg-white/5 animate-pulse border border-border/20 shrink-0" />
    );
  }

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

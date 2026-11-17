import { BookOpen, Bell, TrendingUp, Send, Plus, Globe, Sparkles, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { getUnreadCount, formatUnreadCount } from '@/lib/utils';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { ContinueReading } from '@/features/dashboard/components/ContinueReading';
import { RecentActivity } from '@/features/dashboard/components/RecentActivity';
import { usePageTitle } from '@/lib/usePageTitle';
import { useSession } from '@/lib/auth-client';
import { useState } from 'react';
import { AuthModal } from '@/features/auth/AuthModal';

export function DashboardPage() {
  usePageTitle('Dashboard');
  const { data: session } = useSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { data: manhwas, isLoading, isError } = trpc.manhwa.getAll.useQuery();
  const { data: telegramSourcesCount } = trpc.manhwa.getTelegramCount.useQuery();

  const user = session?.user;
  const isAdmin = (user as any)?.role === 'admin';

  if (isError) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <div className="text-red-500 mb-4">
          <BookOpen size={48} className="opacity-50" />
        </div>
        <h3 className="text-lg font-medium mb-1">Failed to load library</h3>
        <p className="text-muted-foreground max-w-sm">
          There was an error loading your manhwa. Please try refreshing the page.
        </p>
      </div>
    );
  }

  const manhwasList = Array.isArray(manhwas) ? manhwas : [];
  const totalManhwa = manhwasList.length;

  // Calculate unread
  const unreadCountArray = manhwasList.map((m) =>
    getUnreadCount(m.progress?.latestChapter, m.progress?.lastChapter)
  );
  const unreadCount = unreadCountArray.reduce((acc, curr) => acc + curr, 0);
  const ongoingCount = manhwasList.filter((m) => m.status === 'ongoing').length;
  const telegramSources = telegramSourcesCount ?? 0;

  // Manhwas with unread chapters
  const continueReading = manhwasList
    .filter((m) => {
      if (m.status === 'completed') return false;
      const unread = getUnreadCount(m.progress?.latestChapter, m.progress?.lastChapter);
      return unread > 0;
    })
    .sort((a, b) => {
      const unreadA = getUnreadCount(a.progress?.latestChapter, a.progress?.lastChapter);
      const unreadB = getUnreadCount(b.progress?.latestChapter, b.progress?.lastChapter);
      return unreadB - unreadA;
    })
    .slice(0, 6);

  // Recent activity
  const recentActivity = manhwasList.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* If visitor is not signed in: showcase banner */}
      {!user ? (
        <div className="relative rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#161719] to-background border border-amber-500/20 p-6 sm:p-8 overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-xl space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Public Manhwa Catalog</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Discover & Track Your Favorite Manhwa
            </h1>
            <p className="text-sm text-zinc-400">
              Browse {totalManhwa} tracked series across multiple sources. Sign in or create a free account to maintain your private reading progress, get release updates, and mark chapters as read.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <Button
                onClick={() => setAuthModalOpen(true)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-amber-500/20 gap-2 cursor-pointer w-full sm:w-auto justify-center"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / Create Account</span>
              </Button>
              <Button
                variant="outline"
                asChild
                className="bg-[#111214] border-border/40 hover:border-amber-500/30 text-zinc-300 text-xs sm:text-sm rounded-xl w-full sm:w-auto justify-center py-2.5"
              >
                <Link to="/library">Explore Library ↗</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Welcome header for signed-in user */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
              Welcome back, {user.name || 'Reader'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {unreadCount > 0
                ? `${formatUnreadCount(unreadCount)} new chapters waiting across your library.`
                : 'You are all caught up! All monitored sources are synced.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs bg-[#161719] border-border/30 hover:border-amber-500/30 text-zinc-300 hover:text-white btn-press gap-1.5 h-8 rounded-lg"
              >
                <Link to="/sources">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sources</span>
                </Link>
              </Button>
            )}

            {isAdmin && (
              <Button
                size="sm"
                asChild
                className="text-xs bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold btn-press gap-1.5 h-8 rounded-lg shadow-sm"
              >
                <Link to="/add">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Manhwa</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="animate-fade-up" style={{ '--i': 0 } as React.CSSProperties}>
          <StatCard
            icon={<BookOpen size={18} />}
            label="In Library"
            value={totalManhwa}
            to="/library"
            accent="violet"
          />
        </div>
        {user && (
          <div className="animate-fade-up" style={{ '--i': 1 } as React.CSSProperties}>
            <StatCard
              icon={<Bell size={18} />}
              label="Unread Chapters"
              value={formatUnreadCount(unreadCount)}
              valueClassName="text-amber-400"
              to="/library?filter=Unread"
              accent="amber"
            />
          </div>
        )}
        <div className="animate-fade-up" style={{ '--i': 2 } as React.CSSProperties}>
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Ongoing"
            value={ongoingCount}
            to="/library?filter=Reading"
            accent="emerald"
          />
        </div>
        {isAdmin && (
          <div className="animate-fade-up" style={{ '--i': 3 } as React.CSSProperties}>
            <StatCard
              icon={<Send size={18} />}
              label="Telegram Sources"
              value={telegramSources}
              to="/settings"
              accent="blue"
            />
          </div>
        )}
      </div>

      {/* Continue Reading — only visible when signed in */}
      {user && (
        <ContinueReading manhwas={continueReading} hasLibrary={totalManhwa > 0} />
      )}

      {/* Recent Activity / Catalog Explorer */}
      <RecentActivity manhwas={recentActivity} isLoggedIn={!!user} />

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}

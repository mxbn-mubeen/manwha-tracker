import { BookOpen, Bell, TrendingUp, Send } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { ContinueReading } from '@/features/dashboard/components/ContinueReading';
import { RecentActivity } from '@/features/dashboard/components/RecentActivity';

export function DashboardPage() {
  const { data: manhwas, isLoading, isError } = trpc.manhwa.getAll.useQuery();
  const { data: telegramSourcesCount } = trpc.manhwa.getTelegramCount.useQuery();

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
  const unreadCount = manhwasList.reduce((acc, m) => {
    const unread = (m.progress?.latestChapter ?? 0) - (m.progress?.lastChapter ?? 0);
    return acc + (unread > 0 ? unread : 0);
  }, 0);

  const ongoingCount = manhwasList.filter(m => m.status === 'ongoing').length;

  const telegramSources = telegramSourcesCount ?? 0;

  // Manhwas with unread chapters
  const continueReading = manhwasList
    .filter(m => {
      const unread = (m.progress?.latestChapter ?? 0) - (m.progress?.lastChapter ?? 0);
      return unread > 0;
    })
    .sort((a, b) => {
      const unreadA = (a.progress?.latestChapter ?? 0) - (a.progress?.lastChapter ?? 0);
      const unreadB = (b.progress?.latestChapter ?? 0) - (b.progress?.lastChapter ?? 0);
      return unreadB - unreadA;
    })
    .slice(0, 6);

  // Recent activity (just using all manhwas sorted by updatedAt for now, or just the first few)
  const recentActivity = manhwasList.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
        <p className="text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} new chapters waiting across your library.` : 'You are all caught up!'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<BookOpen size={18} />} label="In Library" value={totalManhwa} to="/library" />
        <StatCard icon={<Bell size={18} className="text-amber-500" />} label="Unread Chapters" value={unreadCount} valueClassName="text-amber-500" to="/library?filter=Unread" />
        <StatCard icon={<TrendingUp size={18} />} label="Ongoing" value={ongoingCount} to="/library?filter=Reading" />
        <StatCard icon={<Send size={18} />} label="Telegram Sources" value={telegramSources} to="/settings" />
      </div>

      {/* Continue Reading */}
      <ContinueReading manhwas={continueReading} hasLibrary={totalManhwa > 0} />

      {/* Recent Activity */}
      <RecentActivity manhwas={recentActivity} />
    </div>
  );
}
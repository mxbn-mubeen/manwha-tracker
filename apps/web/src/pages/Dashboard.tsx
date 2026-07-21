import { BookOpen, Bell, TrendingUp, Send, Clock } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

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
        <StatCard icon={<BookOpen size={18} />} label="In Library" value={totalManhwa} />
        <StatCard icon={<Bell size={18} className="text-amber-500" />} label="Unread Chapters" value={unreadCount} valueClassName="text-amber-500" />
        <StatCard icon={<TrendingUp size={18} />} label="Ongoing" value={ongoingCount} />
        <StatCard icon={<Send size={18} />} label="Telegram Sources" value={telegramSources} />
      </div>

      {/* Continue Reading */}
      {continueReading && continueReading.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Continue Reading</h2>
            <p className="text-sm text-muted-foreground">Pick up where you left off</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {continueReading.map((m) => {
              const unread = (m.progress?.latestChapter ?? 0) - (m.progress?.lastChapter ?? 0);
              return (
                <Link to={`/manhwa/${m.id}`} key={m.id} className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-zinc-900 border border-border/50 transition-all hover:border-amber-500/50 hover:glow block">
                  {m.coverUrl ? (
                    <img src={m.coverUrl} alt={m.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-600 text-xs font-medium">NO COVER</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

                  {unread > 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-amber-500 text-amber-950 font-bold border-none hover:bg-amber-500/90 shadow-md">
                        +{unread}
                      </Badge>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-semibold text-sm line-clamp-1 mb-1 text-white">{m.title}</h3>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Ch. {m.progress?.lastChapter ?? 0}</span>
                      <span>/ {m.progress?.latestChapter ?? 0}</span>
                    </div>
                    <div className="mt-2 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, ((m.progress?.lastChapter ?? 0) / Math.max(1, (m.progress?.latestChapter ?? 1))) * 100))}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Recent Activity</h2>
            <p className="text-sm text-muted-foreground">Latest updates from your sources</p>
          </div>
          <Link to="/library" className="text-sm font-medium hover:text-amber-500 transition-colors">
            View library
          </Link>
        </div>

        <Card className="divide-y divide-border/50 bg-card overflow-hidden">
          {recentActivity.map((m) => {
            const unread = (m.progress?.latestChapter ?? 0) - (m.progress?.lastChapter ?? 0);
            return (
              <div key={m.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                <div className="h-12 w-12 rounded bg-zinc-800 overflow-hidden shrink-0 border border-border/50">
                  {m.coverUrl ? (
                    <img src={m.coverUrl} alt={m.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">N/A</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm sm:text-base line-clamp-1">{m.title}</h4>
                  <p className="text-xs text-muted-foreground">Read Ch. {m.progress?.lastChapter ?? 0} • Latest Ch. {m.progress?.latestChapter ?? 0}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {unread > 0 && (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 hidden sm:inline-flex">
                      +{unread} new
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock size={12} className="hidden sm:inline" />
                    2h ago
                  </div>
                </div>
              </div>
            );
          })}
          {recentActivity.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No recent activity found.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, valueClassName = "text-foreground" }: { icon: React.ReactNode, label: string, value: number | string, valueClassName?: string }) {
  return (
    <Card className="p-5 flex flex-col gap-3 bg-card border-border/50 shadow-sm transition-all hover:bg-white/[0.02]">
      <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${valueClassName}`}>{value}</div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

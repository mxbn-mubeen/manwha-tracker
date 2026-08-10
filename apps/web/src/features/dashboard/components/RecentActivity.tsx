import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { getProxiedImageUrl } from '../../../utils/image';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { formatTimeAgo } from '@manhwa-tracker/utils';
import type { RouterOutputs } from '@/lib/trpc';

type Manhwa = RouterOutputs['manhwa']['getAll'][number];

interface RecentActivityProps {
  manhwas: Manhwa[];
}

function RecentActivityCover({ coverUrl, title }: { coverUrl: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  if (!coverUrl || failed) {
    return <div className="w-full h-full flex items-center justify-center text-zinc-600">N/A</div>;
  }
  return (
    <img
      src={getProxiedImageUrl(coverUrl) as string}
      alt={title}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover"
    />
  );
}

export function RecentActivity({ manhwas }: RecentActivityProps) {
  return (
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
        {manhwas.map((m) => {
          const unread = (m.progress?.latestChapter ?? 0) - (m.progress?.lastChapter ?? 0);
          return (
            <Link
              to={`/manhwa/${m.id}`}
              key={m.id}
              className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
            >
              <div className="h-12 w-12 rounded bg-zinc-800 overflow-hidden shrink-0 border border-border/50">
                <RecentActivityCover coverUrl={m.coverUrl} title={m.title} />
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
                  {m.updatedAt ? formatTimeAgo(m.updatedAt) : 'unknown'}
                </div>
              </div>
            </Link>
          );
        })}
        {manhwas.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No recent activity found.
          </div>
        )}
      </Card>
    </div>
  );
}
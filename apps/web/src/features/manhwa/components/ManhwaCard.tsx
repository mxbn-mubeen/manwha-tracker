import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import type { RouterOutputs } from '@/lib/trpc';

type Manhwa = RouterOutputs['manhwa']['getAll'][number];

export function ManhwaCard({ manhwa }: { manhwa: Manhwa }) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [manhwa.coverUrl]);
  const unread = (manhwa.progress?.latestChapter ?? 0) - (manhwa.progress?.lastChapter ?? 0);
  const progressPercent = Math.min(
    100,
    Math.max(
      0,
      ((manhwa.progress?.lastChapter ?? 0) / Math.max(1, manhwa.progress?.latestChapter ?? 1)) * 100
    )
  );

  return (
    <Link
      to={`/manhwa/${manhwa.id}`}
      className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-zinc-900 border border-border/50 transition-all hover:border-amber-500/50 hover:glow block"
    >
      {manhwa.coverUrl && !imgFailed ? (
        <img
          src={manhwa.coverUrl}
          alt={manhwa.title}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-600 text-xs font-medium">
          NO COVER
        </div>
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
        <h3 className="font-semibold text-sm line-clamp-1 mb-1 text-white">{manhwa.title}</h3>
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Ch. {manhwa.progress?.lastChapter ?? 0}</span>
          <span>/ {manhwa.progress?.latestChapter ?? 0}</span>
        </div>
        <div className="mt-2 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
import { CheckCircle2, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RouterOutputs } from '@/lib/trpc';
import { ManhwaCard } from '@/features/manhwa/components/ManhwaCard';

type Manhwa = RouterOutputs['manhwa']['getAll'][number];

interface ContinueReadingProps {
  manhwas: Manhwa[];
  hasLibrary: boolean;
}

export function ContinueReading({ manhwas, hasLibrary }: ContinueReadingProps) {
  // Nothing to show either way if the library itself is empty — that's the
  // Library page's job to prompt for, not this section's.
  if (!hasLibrary) return null;

  if (manhwas.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Continue Reading</h2>
          <p className="text-sm text-muted-foreground">Pick up where you left off</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 p-8 flex flex-col items-center text-center gap-2">
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-1">
            <CheckCircle2 size={22} />
          </div>
          <p className="font-semibold text-white">All caught up</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            No unread chapters across your library right now. Check back after next sync.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Continue Reading</h2>
          <p className="text-sm text-muted-foreground">Pick up where you left off</p>
        </div>
        <Link
          to="/library?filter=Unread"
          className="text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors flex items-center gap-1"
        >
          <span>View all unread</span>
          <BookOpen className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {manhwas.map((m, i) => (
          <div
            key={m.id}
            className="animate-card-enter"
            style={{ '--i': i } as React.CSSProperties}
          >
            <ManhwaCard manhwa={m} />
          </div>
        ))}
      </div>
    </div>
  );
}

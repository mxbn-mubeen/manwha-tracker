import { CheckCircle2 } from 'lucide-react';
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
        <div className="rounded-lg border border-border/50 bg-card p-8 flex flex-col items-center text-center gap-2">
          <CheckCircle2 className="text-amber-500" size={28} />
          <p className="font-medium">All caught up</p>
          <p className="text-sm text-muted-foreground">No unread chapters across your library right now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Continue Reading</h2>
        <p className="text-sm text-muted-foreground">Pick up where you left off</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {manhwas.map((m) => (
          <ManhwaCard key={m.id} manhwa={m} />
        ))}
      </div>
    </div>
  );
}
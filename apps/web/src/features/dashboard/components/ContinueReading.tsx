import type { RouterOutputs } from '@/lib/trpc';
import { ManhwaCard } from '@/features/manhwa/components/ManhwaCard';

type Manhwa = RouterOutputs['manhwa']['getAll'][number];

interface ContinueReadingProps {
  manhwas: Manhwa[];
}

export function ContinueReading({ manhwas }: ContinueReadingProps) {
  if (!manhwas || manhwas.length === 0) return null;

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

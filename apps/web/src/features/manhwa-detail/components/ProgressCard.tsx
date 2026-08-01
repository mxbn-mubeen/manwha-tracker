import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ProgressCardProps {
  localChapter: number;
  latestChapter: number;
  status: string;
  onProgressChange: (newChapter: number) => void;
  isPending: boolean;
}

export function ProgressCard({
  localChapter,
  latestChapter,
  status,
  onProgressChange,
  isPending,
}: ProgressCardProps) {
  const unread = Math.max(0, latestChapter - localChapter);

  const progressPercent = Math.min(
    100,
    Math.max(0, (localChapter / Math.max(1, latestChapter)) * 100)
  );

  const hideStepper =
    latestChapter <= 0 ||
    (localChapter >= latestChapter &&
      ['completed', 'hiatus', 'dropped'].includes(status));

  return (
    <Card className="bg-[#161719] border-border/30 p-6 rounded-2xl shadow-lg">
      <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-6">
        Reading Progress
      </h3>

      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">{localChapter}</span>
            <span className="text-2xl font-bold text-muted-foreground">
              / {latestChapter}
            </span>
          </div>

          {!hideStepper ? (
            <div className="flex items-center gap-4 bg-[#0e0f11] px-1 py-1 rounded-lg border border-border/30">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-white rounded-md"
                onClick={() => onProgressChange(localChapter - 1)}
                disabled={localChapter <= 0 || isPending}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>

              <div className="w-8 text-center font-medium">
                {localChapter}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-white rounded-md"
                onClick={() => onProgressChange(localChapter + 1)}
                disabled={isPending || localChapter >= latestChapter}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400">
              ✓ Caught up
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="h-2 w-full bg-[#0e0f11] rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-amber-500">
              {unread > 0
                ? `${unread} new chapters available`
                : 'Caught up!'}
            </div>

            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs font-semibold text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                onClick={() => onProgressChange(latestChapter)}
                disabled={isPending}
              >
                Mark as caught up
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
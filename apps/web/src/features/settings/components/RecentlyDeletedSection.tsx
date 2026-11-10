import { trpc } from "@/lib/trpc";
import { Trash2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ManhwaCoverImage } from "@/features/sources/components/ManhwaCoverImage";

const DAYS_UNTIL_PURGE = 30;

function getDaysRemaining(deletedAt: string | Date): number {
  const deletedDate = new Date(deletedAt);
  const purgeDate = new Date(deletedDate.getTime() + DAYS_UNTIL_PURGE * 24 * 60 * 60 * 1000);
  const now = new Date();
  const msRemaining = purgeDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
}

export function RecentlyDeletedSection() {
  const utils = trpc.useUtils();
  const { data: deleted = [], isLoading } = trpc.manhwa.getDeleted.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const recoverMutation = trpc.manhwa.recover.useMutation({
    onSuccess: () => {
      toast.success("Manhwa recovered!", {
        description: "It's back in your library.",
      });
      utils.manhwa.getDeleted.invalidate();
      utils.manhwa.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to recover manhwa"),
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
          <Trash2 className="h-4 w-4 text-red-400" />
          Recently Deleted
        </h2>
        <p className="text-sm text-zinc-400 mt-0.5">
          Deleted manhwas are permanently removed after {DAYS_UNTIL_PURGE} days. Recover them here.
        </p>
      </div>

      <div className="bg-[#111214] border border-border/20 rounded-xl p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-zinc-500">
            <p className="text-sm">Loading deleted titles...</p>
          </div>
        ) : deleted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-500 gap-2">
            <Trash2 className="h-6 w-6 opacity-30 text-zinc-400" />
            <p className="text-sm">No recently deleted manhwas.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/20">
            {deleted.map((m) => {
              const daysLeft = m.deletedAt ? getDaysRemaining(m.deletedAt) : 0;
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-4 py-3.5 first:pt-1 last:pb-1 hover:bg-[#161719]/60 px-2 rounded-lg transition-colors group"
                >
                  <div className="shrink-0 w-10 h-14 rounded overflow-hidden bg-zinc-900 border border-border/30">
                    <ManhwaCoverImage src={m.coverUrl} alt={m.title} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                      {m.title}
                    </p>
                    <p className={`text-xs mt-0.5 ${daysLeft <= 3 ? "text-red-400 font-medium" : "text-zinc-500"}`}>
                      {daysLeft > 0
                        ? `Permanently deleted in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
                        : "Being permanently deleted soon"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 gap-1.5 h-8 btn-press"
                    disabled={recoverMutation.isPending}
                    onClick={() => recoverMutation.mutate(m.id)}
                    aria-label={`Recover ${m.title}`}
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${recoverMutation.isPending ? "animate-spin" : ""}`} />
                    Recover
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

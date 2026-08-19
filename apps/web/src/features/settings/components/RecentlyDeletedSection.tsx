import { trpc } from "@/lib/trpc";
import { Trash2, RefreshCcw, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getProxiedImageUrl } from "@/utils/image";

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
        <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
          <Trash2 className="h-5 w-5 text-red-500" />
          Recently Deleted
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          Deleted manhwas are permanently removed after {DAYS_UNTIL_PURGE} days. Recover them here.
        </p>
      </div>

      <div className="bg-[#0e0f11] border border-border/30 rounded-xl p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-zinc-600">
            <p className="text-sm">Loading..s</p>
          </div>
        ) : deleted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-600 gap-2">
            <Trash2 className="h-6 w-6 opacity-30" />
            <p className="text-sm">No recently deleted manhwas.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/30">
            {deleted.map((m) => {
              const daysLeft = m.deletedAt ? getDaysRemaining(m.deletedAt) : 0;
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="shrink-0 w-10 h-14 rounded overflow-hidden bg-zinc-800 flex items-center justify-center">
                    {m.coverUrl ? (
                      <img
                        src={getProxiedImageUrl(m.coverUrl)}
                        alt={m.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{m.title}</p>
                    <p className={`text-xs mt-0.5 ${daysLeft <= 3 ? "text-red-400" : "text-zinc-500"}`}>
                      {daysLeft > 0
                        ? `Permanently deleted in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`
                        : "Being permanently deleted soon"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 gap-1.5"
                    disabled={recoverMutation.isPending}
                    onClick={() => recoverMutation.mutate(m.id)}
                    aria-label={`Recover ${m.title}`}
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
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

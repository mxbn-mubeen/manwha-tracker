import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ManageChaptersSectionProps {
  manhwaId: number;
  expanded: boolean;
  onToggle: () => void;
}

export function ManageChaptersSection({ manhwaId, expanded, onToggle }: ManageChaptersSectionProps) {
  const utils = trpc.useUtils();

  const { data: chaptersList, isLoading: chaptersLoading, isError: chaptersError, refetch: refetchChapters } =
    trpc.manhwa.getChapters.useQuery(manhwaId, { enabled: expanded });

  const deleteChapterMutation = trpc.manhwa.deleteChapter.useMutation({
    onSuccess: () => {
      toast.success("Chapter removed");
      utils.manhwa.getChapters.invalidate(manhwaId);
      utils.manhwa.getById.invalidate(manhwaId);
      utils.manhwa.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to remove chapter"),
  });

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full text-sm font-medium text-zinc-400 hover:text-white py-2"
      >
        <span>Manage Chapters</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-border/50 bg-[#0e0f11] divide-y divide-border/30">
          {chaptersLoading && (
            <div className="p-3 text-xs text-zinc-500 text-center">Loading chapters…</div>
          )}
          {chaptersError && (
            <div className="p-3 text-xs text-red-400 text-center">
              Failed to load chapters.
              <button type="button" onClick={() => refetchChapters()} className="ml-2 underline">
                Retry
              </button>
            </div>
          )}
          {!chaptersLoading && chaptersList?.length === 0 && (
            <div className="p-3 text-xs text-zinc-500 text-center">No chapters found.</div>
          )}
          {chaptersList?.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm text-white">Ch. {c.chapterNum}</div>
                <div className="text-xs text-zinc-500 truncate max-w-70">
                  {c.sourceId ? "From source" : "Manually set"}
                  {c.discoveredAt ? ` · ${new Date(c.discoveredAt).toLocaleDateString()}` : ""}
                </div>
              </div>
              <Button
                aria-label={`Remove Chapter ${c.chapterNum}`}
                variant="ghost"
                size="sm"
                className="shrink-0 text-red-500 hover:text-red-400 hover:bg-red-500/10 h-7 px-2"
                disabled={deleteChapterMutation.isPending}
                onClick={() => {
                  if (confirm(`Remove Chapter ${c.chapterNum}? This can't be undone.`)) {
                    deleteChapterMutation.mutate(c.id);
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

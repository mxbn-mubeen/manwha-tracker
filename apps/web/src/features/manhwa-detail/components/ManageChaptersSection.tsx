import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ManageChaptersSectionProps {
  manhwaId: number;
  expanded: boolean;
  onToggle: () => void;
}

export function ManageChaptersSection({ manhwaId, expanded, onToggle }: ManageChaptersSectionProps) {
  const utils = trpc.useUtils();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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

  const deleteChaptersBulkMutation = trpc.manhwa.deleteChaptersBulk.useMutation({
    onSuccess: () => {
      toast.success("Chapters removed");
      setSelectedIds(new Set());
      utils.manhwa.getChapters.invalidate(manhwaId);
      utils.manhwa.getById.invalidate(manhwaId);
      utils.manhwa.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to remove chapters"),
  });

  const groupedChapters = useMemo(() => {
    if (!chaptersList) return [];
    
    const groups: {
      id: string;
      chapterIds: number[];
      startNum: number;
      endNum: number;
      sourceStatus: string;
      dateStr: string;
      discoveredAt: Date | null;
    }[] = [];
    
    let currentGroup = null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const c of chaptersList) {
      let dateStr = "Unknown Date";
      if (c.discoveredAt) {
        const d = new Date(c.discoveredAt);
        const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        
        if (dDate.getTime() === today.getTime()) {
          dateStr = "Today";
        } else if (dDate.getTime() === yesterday.getTime()) {
          dateStr = "Yesterday";
        } else {
          dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
      const sourceStatus = c.sourceId ? "source" : "manual";
      
      if (!currentGroup) {
        currentGroup = {
          id: `group-${c.id}`,
          chapterIds: [c.id],
          startNum: c.chapterNum,
          endNum: c.chapterNum,
          sourceStatus,
          dateStr,
          discoveredAt: c.discoveredAt ? new Date(c.discoveredAt) : null,
        };
      } else {
        if (currentGroup.dateStr === dateStr && currentGroup.sourceStatus === sourceStatus) {
          currentGroup.chapterIds.push(c.id);
          currentGroup.endNum = c.chapterNum;
        } else {
          groups.push(currentGroup);
          currentGroup = {
            id: `group-${c.id}`,
            chapterIds: [c.id],
            startNum: c.chapterNum,
            endNum: c.chapterNum,
            sourceStatus,
            dateStr,
            discoveredAt: c.discoveredAt ? new Date(c.discoveredAt) : null,
          };
        }
      }
    }
    
    if (currentGroup) {
      groups.push(currentGroup);
    }
    
    return groups;
  }, [chaptersList]);

  const toggleSelectGroup = (chapterIds: number[]) => {
    const newSet = new Set(selectedIds);
    const allInGroupSelected = chapterIds.every(id => newSet.has(id));
    if (allInGroupSelected) {
      chapterIds.forEach(id => newSet.delete(id));
    } else {
      chapterIds.forEach(id => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (chaptersList && selectedIds.size === chaptersList.length) {
      setSelectedIds(new Set());
    } else if (chaptersList) {
      setSelectedIds(new Set(chaptersList.map((c) => c.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Remove ${selectedIds.size} selected chapters? This can't be undone.`)) {
      deleteChaptersBulkMutation.mutate(Array.from(selectedIds));
    }
  };

  const allSelected = chaptersList && chaptersList.length > 0 && selectedIds.size === chaptersList.length;

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
        <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-border/50 bg-[#0e0f11] flex flex-col">
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
          {!chaptersLoading && groupedChapters.length === 0 && (
            <div className="p-3 text-xs text-zinc-500 text-center">No chapters found.</div>
          )}
          {!chaptersLoading && groupedChapters.length > 0 && (
            <>
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/50 border-b border-border/30 sticky top-0 z-10 backdrop-blur-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={selectAll}
                    className="rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary focus:ring-offset-zinc-900"
                  />
                  Select All
                </label>
                {selectedIds.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={deleteChaptersBulkMutation.isPending}
                    className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    Delete Selected ({selectedIds.size})
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                {groupedChapters.map((g) => {
                  const allSelectedInGroup = g.chapterIds.every(id => selectedIds.has(id));
                  const someSelectedInGroup = g.chapterIds.some(id => selectedIds.has(id));
                  const isChecked = allSelectedInGroup;
                  const isIndeterminate = someSelectedInGroup && !allSelectedInGroup;
                  const label = g.startNum === g.endNum ? `Ch. ${g.startNum}` : `Ch. ${g.endNum} - ${g.startNum}`;

                  return (
                    <div
                      key={g.id}
                      className={cn(
                        "flex flex-col justify-between rounded-lg border border-border/30 p-2.5 transition-colors cursor-pointer",
                        someSelectedInGroup ? "bg-primary/5 border-primary/30" : "bg-zinc-900/30 hover:bg-zinc-800/50"
                      )}
                      onClick={() => toggleSelectGroup(g.chapterIds)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            ref={el => {
                              if (el) el.indeterminate = isIndeterminate;
                            }}
                            onChange={() => toggleSelectGroup(g.chapterIds)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary focus:ring-offset-zinc-900 cursor-pointer shrink-0 mt-0.5"
                          />
                          <div className="text-sm font-medium text-white truncate">{label}</div>
                        </div>
                        <Button
                          aria-label={`Remove ${label}`}
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-red-500 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 p-0 rounded-md -mt-1 -mr-1"
                          disabled={deleteChapterMutation.isPending || deleteChaptersBulkMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            const confirmLabel = g.startNum === g.endNum ? `Chapter ${g.startNum}` : `Chapters ${g.endNum} - ${g.startNum}`;
                            if (confirm(`Remove ${confirmLabel}? This can't be undone.`)) {
                              if (g.chapterIds.length === 1) {
                                deleteChapterMutation.mutate(g.chapterIds[0]!);
                              } else {
                                deleteChaptersBulkMutation.mutate(g.chapterIds);
                              }
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="mt-2 text-[11px] text-zinc-500 flex flex-col gap-0.5 ml-5">
                        <div className="truncate">
                          {g.sourceStatus === "source" ? "From source" : "Manually set"}
                          {g.chapterIds.length > 1 && ` · ${g.chapterIds.length} chs`}
                        </div>
                        {g.dateStr && <div className="truncate text-zinc-400">{g.dateStr}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

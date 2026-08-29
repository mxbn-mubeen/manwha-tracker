import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Pencil, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { getAdapterBadgeClass } from "../utils/adapterColors";

export function SourceCard({ source }: { source: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(source.url);
  const utils = trpc.useUtils();

  const updateMutation = trpc.manhwa.updateSourceUrl.useMutation({
    onSuccess: () => {
      toast.success("Source updated successfully!");
      setIsEditing(false);
      utils.manhwa.getAllSources.invalidate();
      utils.manhwa.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const handleSave = () => {
    if (editUrl.trim() === source.url) {
      setIsEditing(false);
      return;
    }
    updateMutation.mutate({ id: source.id, url: editUrl.trim() });
  };

  return (
    <div className="border border-border/30 rounded-lg bg-[#161719] p-4 space-y-3">
      <div className="flex justify-between items-start gap-2">
        <Link to={`/manhwa/${source.manhwaId}`} className="font-semibold text-white hover:underline truncate">
          {source.manhwaTitle}
        </Link>
        <span className={`px-2 py-1 border rounded text-xs font-mono shrink-0 ${getAdapterBadgeClass(source.adapterKey)}`}>
          {source.adapterKey}
        </span>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Input 
            value={editUrl} 
            onChange={(e) => setEditUrl(e.target.value)}
            className="h-9 w-full bg-[#0e0f11] border-border/50 text-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setEditUrl(source.url);
                setIsEditing(false);
              }
            }}
          />
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => { setIsEditing(false); setEditUrl(source.url); }} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-amber-950" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm text-zinc-400" title={source.url}>
              {source.url}
            </span>
            <a href={source.url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white shrink-0">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="flex justify-end pt-1">
            <Button size="sm" variant="outline" className="h-8 gap-2 w-full sm:w-auto border-border/30 bg-[#0e0f11] text-zinc-300 hover:bg-[#202123] hover:text-white" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit URL
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Pencil, Check, X, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { getAdapterBadgeClass } from "../utils/adapterColors";

export function SourceRow({ source }: { source: any }) {
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
    <tr className="hover:bg-white/5 transition-colors">
      <td className="px-6 py-4 font-medium whitespace-nowrap max-w-[200px] truncate">
        <Link to={`/manhwa/${source.manhwaId}`} className="hover:underline text-white">
          {source.manhwaTitle}
        </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 border rounded text-xs font-mono ${getAdapterBadgeClass(source.adapterKey)}`}>
          {source.adapterKey}
        </span>
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <Input 
            value={editUrl} 
            onChange={(e) => setEditUrl(e.target.value)}
            className="h-8 w-full min-w-[250px] bg-[#0e0f11] border-border/50 text-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') {
                setEditUrl(source.url);
                setIsEditing(false);
              }
            }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="truncate max-w-[150px] sm:max-w-[300px] lg:max-w-[500px]" title={source.url}>
              {source.url}
            </span>
            <a href={source.url} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white shrink-0">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-right whitespace-nowrap">
        {isEditing ? (
          <div className="flex items-center justify-end gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10" onClick={() => { setIsEditing(false); setEditUrl(source.url); }} disabled={updateMutation.isPending}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/10" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}

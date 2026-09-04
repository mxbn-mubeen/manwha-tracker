import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Pencil, Check, X, Link2, Copy, RefreshCw, Trash2, ImageOff } from "lucide-react";
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
  
  const removeMutation = trpc.manhwa.removeSource.useMutation({
    onSuccess: () => {
      toast.success("Source removed");
      utils.manhwa.getAllSources.invalidate();
    }
  });

  const handleSave = () => {
    if (editUrl.trim() === source.url) {
      setIsEditing(false);
      return;
    }
    updateMutation.mutate({ id: source.id, url: editUrl.trim() });
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(source.url);
    toast.success("URL copied to clipboard");
  };

  let dotColorClass = "bg-zinc-600";
  const badgeClass = getAdapterBadgeClass(source.adapterKey);
  if (badgeClass.includes("text-orange-400") || badgeClass.includes("text-amber-400")) dotColorClass = "bg-orange-500";
  else if (badgeClass.includes("text-blue-400")) dotColorClass = "bg-blue-500";
  else if (badgeClass.includes("text-emerald-400") || badgeClass.includes("text-green-400")) dotColorClass = "bg-emerald-500";
  else if (badgeClass.includes("text-purple-400")) dotColorClass = "bg-purple-500";
  else if (badgeClass.includes("text-rose-400") || badgeClass.includes("text-red-400")) dotColorClass = "bg-rose-500";
  else if (badgeClass.includes("text-cyan-400") || badgeClass.includes("text-sky-400")) dotColorClass = "bg-cyan-500";

  return (
    <tr className="hover:bg-white/[0.02] transition-colors group">
      <td className="px-6 py-4 whitespace-nowrap min-w-[250px]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-14 rounded overflow-hidden bg-[#161719] border border-border/20 shrink-0 flex items-center justify-center">
            {source.manhwaCover ? (
              <img src={source.manhwaCover} alt={source.manhwaTitle} className="w-full h-full object-cover" />
            ) : (
              <ImageOff className="w-4 h-4 text-zinc-600" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <Link to={`/manhwa/${source.manhwaId}`} className="font-medium hover:underline text-zinc-200 truncate" title={source.manhwaTitle}>
              {source.manhwaTitle}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-zinc-500">ID: {source.id}</span>
              {source.isActive && (
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">Active</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
          <span className="text-sm font-medium text-zinc-300 capitalize">{source.adapterKey}</span>
        </div>
      </td>
      <td className="px-6 py-4 max-w-0 w-full">
        {isEditing ? (
          <Input 
            value={editUrl} 
            onChange={(e) => setEditUrl(e.target.value)}
            className="h-9 w-full min-w-[250px] bg-[#0e0f11] border-border/30 text-white rounded-lg"
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
          <div className="flex items-center justify-between gap-4 group/url">
            <div className="flex items-center gap-2 min-w-0">
              <Link2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <a href={source.url} target="_blank" rel="noreferrer" className="text-sm text-zinc-400 hover:text-zinc-200 truncate hover:underline" title={source.url}>
                {source.url}
              </a>
            </div>
            <button onClick={handleCopy} className="text-zinc-500 hover:text-zinc-300 opacity-0 group-hover/url:opacity-100 transition-opacity p-1">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-right whitespace-nowrap">
        {isEditing ? (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 border border-emerald-400/20" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-border/20" onClick={() => { setIsEditing(false); setEditUrl(source.url); }} disabled={updateMutation.isPending}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent hover:border-border/20 bg-[#161719]" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent hover:border-border/20 bg-[#161719]" title="Sync now (coming soon)">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-transparent hover:border-red-500/20 bg-[#161719]" onClick={() => {
              if (confirm('Are you sure you want to remove this source?')) {
                removeMutation.mutate({ manhwaId: source.manhwaId, url: source.url });
              }
            }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

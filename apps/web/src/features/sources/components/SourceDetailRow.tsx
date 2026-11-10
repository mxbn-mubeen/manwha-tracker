import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Globe,
  Send,
  Link2,
  Copy,
  Pencil,
  Check,
  X,
  Trash2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { getAdapterBadgeClass } from '../utils/adapterColors';
import type { SourceItem } from './ManhwaSourcesView';

export function SourceDetailRow({ source }: { source: SourceItem }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(source.url);
  const utils = trpc.useUtils();

  const updateMutation = trpc.manhwa.updateSourceUrl.useMutation({
    onSuccess: () => {
      toast.success('Source URL updated!');
      setIsEditing(false);
      utils.manhwa.getAllSources.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.manhwa.removeSource.useMutation({
    onSuccess: () => {
      toast.success('Source removed');
      utils.manhwa.getAllSources.invalidate();
    },
  });

  const handleSave = () => {
    if (editUrl.trim() === source.url) {
      setIsEditing(false);
      return;
    }
    updateMutation.mutate({ id: source.id, url: editUrl.trim() });
  };

  const isTele = source.type === 'telegram';
  const badgeCls = getAdapterBadgeClass(source.adapterKey);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-[#111214] border border-border/20 transition-all duration-200 hover:bg-[#161719] hover:border-border/30">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium ${badgeCls}`}
        >
          {isTele ? <Send className="w-3 h-3 text-blue-400" /> : <Globe className="w-3 h-3 text-amber-400" />}
          <span className="capitalize">{source.adapterKey}</span>
        </span>

        {isEditing ? (
          <Input
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            className="h-8 text-xs bg-[#161719] border-border/40 text-white rounded-md flex-1"
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
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-zinc-300 hover:text-amber-400 truncate hover:underline"
              title={source.url}
            >
              {source.url}
            </a>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-500 hover:text-zinc-300"
              title="Open in new tab"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5 shrink-0 self-end sm:self-center">
        {isEditing ? (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10 border border-emerald-400/20"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-border/20"
              onClick={() => {
                setIsEditing(false);
                setEditUrl(source.url);
              }}
              disabled={updateMutation.isPending}
            >
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded text-zinc-400 hover:text-white bg-[#161719] border border-border/20"
              onClick={() => {
                navigator.clipboard.writeText(source.url);
                toast.success('URL copied to clipboard');
              }}
              title="Copy URL"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded text-zinc-400 hover:text-white bg-[#161719] border border-border/20"
              onClick={() => setIsEditing(true)}
              title="Edit URL"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded text-red-400 hover:text-red-300 hover:bg-red-400/10 bg-[#161719] border border-border/20"
              onClick={() => {
                if (confirm('Are you sure you want to remove this source?')) {
                  removeMutation.mutate({ manhwaId: source.manhwaId, url: source.url });
                }
              }}
              title="Remove source"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}


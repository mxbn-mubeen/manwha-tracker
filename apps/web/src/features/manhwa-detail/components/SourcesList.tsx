import { useState } from 'react';
import { Plus, Send, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { StatusBadge, computeStatus, timeAgo } from './SourceStatusBadge';

interface Source {
  url: string | null;
  type: string | null;
  latestChapterNum: number | null;
  lastDiscoveredAt: Date | string | null;
}

interface SourcesListProps {
  manhwaId: number;
  sources: Source[] | undefined;
  latestChapter: number;
}

export function SourcesList({ manhwaId, sources, latestChapter }: SourcesListProps) {
  const utils = trpc.useUtils();
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceType, setNewSourceType] = useState<'telegram' | 'website'>('telegram');

  const addSourceMutation = trpc.manhwa.addSource.useMutation({
    onSuccess: () => {
      toast.success('Source added!');
      setNewSourceUrl('');
      utils.manhwa.getById.invalidate(manhwaId);
    },
    onError: (err) => toast.error(err.message || 'Failed to add source'),
  });

  const removeSourceMutation = trpc.manhwa.removeSource.useMutation({
    onSuccess: () => {
      toast.success('Source removed');
      utils.manhwa.getById.invalidate(manhwaId);
    },
    onError: () => toast.error('Failed to remove source'),
  });

  const handleAddSource = () => {
    addSourceMutation.mutate({ manhwaId, url: newSourceUrl.trim(), type: newSourceType });
  };

  return (
    <div className="space-y-4 pt-2">
      <h3 className="text-xl font-bold text-white mb-4">Sources</h3>

      {sources && sources.length > 0 ? (
        sources.map((source, i: number) => {
          if (!source.url || !source.type) return null;
          const isTelegram = source.type === 'telegram';

          let displayName = 'Unknown';
          try {
            displayName = isTelegram
              ? '@' + (source.url.split('/').pop() ?? source.url)
              : new URL(source.url.startsWith('http') ? source.url : 'https://' + source.url).hostname;
          } catch {
            return null;
          }

          const status = computeStatus(source.latestChapterNum, latestChapter, sources);
          const leaderSource = sources.find(s => computeStatus(s.latestChapterNum, latestChapter, sources) === 'leading');
          const leaderDiscoveredAt = leaderSource?.lastDiscoveredAt ?? null;

          return (
            <div key={i} className="relative group/source">
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="block">
                <Card className="bg-[#161719] border-border/30 p-4 rounded-xl group-hover/source:border-amber-500/30 transition-colors pr-14">
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isTelegram ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {isTelegram ? (
                        <Send size={18} className="-ml-0.5" />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                          <path d="M2 12H22" stroke="currentColor" strokeWidth="2" />
                          <path d="M12 2C15.3137 2 18 6.47715 18 12C18 17.5228 15.3137 22 12 22C8.68629 22 6 17.5228 6 12C6 6.47715 8.68629 2 12 2Z" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h4 className="font-semibold text-white truncate max-w-[200px] sm:max-w-[300px]">{displayName}</h4>
                        <span className="text-xs text-muted-foreground shrink-0">{isTelegram ? 'Telegram' : 'Website'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-sm font-medium text-zinc-300">
                          {source.latestChapterNum !== null ? `Ch. ${source.latestChapterNum}` : '—'}
                        </span>
                        {source.lastDiscoveredAt && (
                          <span className="text-xs text-muted-foreground/60">Last discovered {timeAgo(source.lastDiscoveredAt)}</span>
                        )}
                      </div>
                      <div className="mt-1.5">
                        <StatusBadge
                          status={status}
                          sourceChapter={source.latestChapterNum}
                          globalMax={latestChapter}
                          thisDiscoveredAt={source.lastDiscoveredAt}
                          leaderDiscoveredAt={leaderDiscoveredAt}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-100 sm:opacity-0 sm:group-hover/source:opacity-100 sm:group-focus-within/source:opacity-100 transition-opacity text-zinc-500 hover:text-red-400 hover:bg-red-500/10 absolute right-3 top-3"
                onClick={() => {
                  if (confirm('Are you sure you want to remove this source?')) {
                    removeSourceMutation.mutate({ manhwaId, url: source.url as string });
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-muted-foreground">No sources linked for this manhwa.</p>
      )}

      <Card className="bg-transparent border border-dashed border-border/50 p-4 rounded-xl mt-4">
        <p className="text-sm font-medium text-white mb-3">Add a source</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={newSourceType}
            onChange={(e) => setNewSourceType(e.target.value as 'telegram' | 'website')}
            className="bg-[#161719] border border-border/50 text-white text-sm rounded-lg px-3 py-2 w-full sm:w-[140px] focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="telegram">Telegram</option>
            <option value="website">Website</option>
          </select>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && newSourceUrl.trim() && !addSourceMutation.isPending) handleAddSource(); }}
              placeholder={newSourceType === 'telegram' ? '@channel_name or t.me/...' : 'https://example.com/...'}
              className="bg-[#161719] border border-border/50 text-white text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-muted-foreground"
            />
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-3 shrink-0 rounded-lg"
              onClick={handleAddSource}
              disabled={addSourceMutation.isPending || !newSourceUrl.trim()}
            >
              {addSourceMutation.isPending ? (
                <div className="h-4 w-4 border-2 border-amber-950/40 border-t-amber-950 rounded-full animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
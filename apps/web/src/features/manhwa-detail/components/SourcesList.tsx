import { Send, Globe, Trash2, ExternalLink, Clock, BookOpen } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { StatusBadge, computeStatus, timeAgo } from './SourceStatusBadge';
import { getAdapterBadgeClass } from '@/features/sources/utils/adapterColors';
import { AddSourceForm } from './AddSourceForm';

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

  const removeSourceMutation = trpc.manhwa.removeSource.useMutation({
    onSuccess: () => {
      toast.success('Source removed');
      utils.manhwa.getById.invalidate(manhwaId);
      utils.manhwa.getAll.invalidate();
    },
    onError: () => toast.error('Failed to remove source'),
  });

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span>Sources</span>
          <span className="text-xs font-mono font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
            {sources?.length ?? 0} linked
          </span>
        </h3>
      </div>

      {sources && sources.length > 0 ? (
        <div className="space-y-3">
          {sources.map((source, i: number) => {
            if (!source.url || !source.type) return null;
            const isTelegram = source.type === 'telegram';

            // Derive adapter key from URL for badge & icon styling
            const adapterKey = (() => {
              if (isTelegram) return 'telegram';
              try {
                const host = new URL(
                  source.url.startsWith('http') ? source.url : 'https://' + source.url
                ).hostname
                  .replace('www.', '')
                  .split('.')[0];
                const hostMap: Record<string, string> = {
                  asurascans: 'asurascans',
                  asuracomic: 'asurascans',
                  reaperscans: 'reaperscans',
                  webtoon: 'webtoon',
                  thunderscans: 'thunderscans',
                  'en-thunderscans': 'thunderscans',
                  manhuaus: 'manhuaus',
                  mgeko: 'mgeko',
                  mgread: 'mgread',
                  arenascan: 'arenascans',
                  arenascans: 'arenascans',
                  comixto: 'comixto',
                  vortexscans: 'vortexscans',
                  infinitelevelup: 'infinitelevelup',
                  theultimateofallages: 'ultimateofallages',
                };
                return hostMap[host ?? ''] ?? 'generic';
              } catch {
                return 'generic';
              }
            })();

            const badgeCls = getAdapterBadgeClass(adapterKey);
            const iconBg = badgeCls.split(' ').find((c) => c.startsWith('bg-')) ?? 'bg-amber-500/10';
            const iconText = badgeCls.split(' ').find((c) => c.startsWith('text-')) ?? 'text-amber-400';

            let displayName = 'Unknown';
            try {
              displayName = isTelegram
                ? '@' + (source.url.split('/').pop() ?? source.url)
                : new URL(source.url.startsWith('http') ? source.url : 'https://' + source.url).hostname;
            } catch {
              return null;
            }

            const status = computeStatus(source.latestChapterNum, latestChapter, sources);
            const leaderSource = sources.find(
              (s) => computeStatus(s.latestChapterNum, latestChapter, sources) === 'leading'
            );
            const leaderDiscoveredAt = leaderSource?.lastDiscoveredAt ?? null;

            return (
              <div
                key={i}
                className="group relative bg-[#111214] hover:bg-[#161719] border border-border/20 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 transition-all shadow-sm card-hover-lift"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  {/* Left: Source Icon & Domain Identity */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${
                        isTelegram
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/25 shadow-sky-500/10'
                          : `${iconBg} ${iconText} border-white/5`
                      }`}
                    >
                      {isTelegram ? (
                        <Send size={19} className="-ml-0.5" />
                      ) : (
                        <Globe size={19} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-white hover:text-amber-300 text-sm sm:text-base transition-colors truncate max-w-[240px] sm:max-w-[360px]"
                          title={displayName}
                        >
                          {displayName}
                        </a>

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold shrink-0 ${
                            isTelegram
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/25'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                          }`}
                        >
                          {isTelegram ? 'Telegram' : 'Website'}
                        </span>

                        {!isTelegram && adapterKey !== 'generic' && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold shrink-0 ${badgeCls}`}>
                            {adapterKey}
                          </span>
                        )}
                      </div>

                      {/* Status & Timing */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <StatusBadge
                          status={status}
                          sourceChapter={source.latestChapterNum}
                          globalMax={latestChapter}
                          thisDiscoveredAt={source.lastDiscoveredAt}
                          leaderDiscoveredAt={leaderDiscoveredAt}
                        />

                        {source.lastDiscoveredAt && (
                          <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            Discovered {timeAgo(source.lastDiscoveredAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Chapter Badge & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/10">
                    {/* Chapter Readout */}
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-white bg-white/5 border border-border/20 px-3 py-1.5 rounded-xl">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {source.latestChapterNum !== null
                          ? `Ch. ${source.latestChapterNum}`
                          : 'No chapters yet'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Visit link */}
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors btn-press"
                        title="Visit source"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      {/* Remove source */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Are you sure you want to remove this source?')) {
                            removeSourceMutation.mutate({ manhwaId, url: source.url as string });
                          }
                        }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors btn-press"
                        title="Remove source"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-zinc-500 text-sm bg-[#111214] border border-border/20 rounded-2xl">
          No sources added yet. Use the form below to connect a website or Telegram channel.
        </div>
      )}

      {/* Add Source Input Form */}
      <AddSourceForm manhwaId={manhwaId} />
    </div>
  );
}

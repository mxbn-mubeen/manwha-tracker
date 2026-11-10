import { useState } from 'react';
import {
  Globe,
  Send,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { getAdapterBadgeClass } from '../utils/adapterColors';
import { SourceDetailRow } from './SourceDetailRow';
import type { SourceItem } from './ManhwaSourcesView';

export interface ProviderGroup {
  key: string;
  name: string;
  type: string;
  sources: SourceItem[];
}

export function ProviderSourcesView({ sources }: { sources: SourceItem[] }) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // Group by provider / adapterKey
  const providersMap = new Map<string, ProviderGroup>();

  for (const s of sources) {
    const key = s.type === 'telegram' ? 'telegram' : s.adapterKey || 'generic';
    if (!providersMap.has(key)) {
      providersMap.set(key, {
        key,
        name: key,
        type: s.type,
        sources: [],
      });
    }
    providersMap.get(key)!.sources.push(s);
  }

  // Sort: Telegram first or highest count first
  const providers = Array.from(providersMap.values()).sort(
    (a, b) => b.sources.length - a.sources.length
  );

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedKeys(new Set(providers.map((p) => p.key)));
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  if (providers.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 border border-border/20 rounded-xl bg-[#111214]">
        No sources found matching your filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
        <span>Showing {providers.length} provider groups</span>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="hover:text-white transition-colors underline"
          >
            Expand All
          </button>
          <span>·</span>
          <button
            onClick={collapseAll}
            className="hover:text-white transition-colors underline"
          >
            Collapse All
          </button>
        </div>
      </div>

      {providers.map((provider, provIdx) => {
        const isExpanded = expandedKeys.has(provider.key);
        const isTele = provider.type === 'telegram';
        const badgeCls = getAdapterBadgeClass(provider.key);

        return (
          <div
            key={provider.key}
            className="bg-[#111214] border border-border/20 rounded-xl overflow-hidden hover:border-border/40 transition-all animate-list-enter"
            style={{ '--i': provIdx } as React.CSSProperties}
          >
            <div
              onClick={() => toggleExpand(provider.key)}
              className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${badgeCls}`}
                >
                  {isTele ? (
                    <Send className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Globe className="w-4 h-4 text-amber-400" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white capitalize text-base">
                      {provider.name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-border/20 text-zinc-400 font-mono">
                      {provider.sources.length} {provider.sources.length === 1 ? 'manhwa' : 'manhwas'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {isTele
                      ? 'Monitored Telegram Channels'
                      : `Website adapter: ${provider.key}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border/10 bg-[#161719]/40 p-4 space-y-2.5 animate-panel-expand">
                {provider.sources.map((s, si) => (
                  <div key={s.id} className="animate-list-enter" style={{ '--i': si } as React.CSSProperties}>
                    <SourceDetailRow source={s} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

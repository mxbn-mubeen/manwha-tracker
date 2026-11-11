import { X, Filter } from 'lucide-react';
import { adapterDotColor } from '../utils/sourceHelpers';

interface Props {
  uniqueDomains: string[];
  domainToAdapter: Record<string, string>;
  domainFilter: string;
  setDomainFilter: (v: string) => void;
  allCount: number;
  countForDomain: (d: string) => number;
  displayAdapters: string[];
  remainingAdapters: number;
}

export function WebsiteFilterPanel({
  uniqueDomains,
  domainToAdapter,
  domainFilter,
  setDomainFilter,
  allCount,
  countForDomain,
  displayAdapters,
  remainingAdapters,
}: Props) {
  return (
    <div className="w-full bg-[#111214] border border-border/20 rounded-2xl p-4 sm:p-5 flex flex-col min-w-0 shadow-sm space-y-3.5">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">Filter by Domain</h3>
              <span className="bg-[#161719] text-amber-400 font-mono text-[11px] px-2 py-0.5 rounded-full border border-border/20">
                {uniqueDomains.length} domains
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5 hidden sm:block">
              Quickly filter and isolate titles scraped from specific provider domains
            </p>
          </div>
        </div>

        {domainFilter && (
          <button
            type="button"
            onClick={() => setDomainFilter('')}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 transition-all btn-press shrink-0"
          >
            <span className="truncate max-w-[150px]">Clear ({domainFilter})</span>
            <X className="w-3.5 h-3.5 shrink-0" />
          </button>
        )}
      </div>

      {/* Horizontal Domain Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* "All Sources" Pill */}
        <button
          type="button"
          onClick={() => setDomainFilter('')}
          className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs transition-all btn-press ${
            domainFilter === ''
              ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 font-semibold shadow-sm shadow-amber-500/10'
              : 'border-border/20 bg-[#161719] text-zinc-300 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${domainFilter === '' ? 'bg-amber-400' : 'bg-zinc-600'}`} />
          <span>All Domains</span>
          <span
            className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
              domainFilter === '' ? 'bg-amber-500/20 text-amber-200' : 'bg-black/30 text-zinc-500'
            }`}
          >
            {allCount}
          </span>
        </button>

        {/* Individual Domain Pills */}
        {uniqueDomains.map((domain) => {
          const isActive = domainFilter === domain;
          const adapterName = domainToAdapter[domain] ?? 'generic';
          const dc = adapterDotColor(adapterName);
          const count = countForDomain(domain);

          return (
            <button
              key={domain}
              type="button"
              onClick={() => setDomainFilter(isActive ? '' : domain)}
              className={`shrink-0 flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs transition-all btn-press ${
                isActive
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 font-semibold shadow-sm shadow-amber-500/10'
                  : 'border-border/20 bg-[#161719] text-zinc-300 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${dc}`} />
              <span className="font-medium">{domain}</span>
              <span
                className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
                  isActive ? 'bg-amber-500/20 text-amber-200' : 'bg-black/30 text-zinc-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Adapter Legend */}
      <div className="pt-2 border-t border-border/10 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-400">Adapter Types:</span>
          <div className="flex flex-wrap gap-3 items-center">
            {displayAdapters.map((a) => (
              <div key={a} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${adapterDotColor(a)}`} />
                <span className="capitalize text-zinc-400">{a}</span>
              </div>
            ))}
            {remainingAdapters > 0 && <span className="text-zinc-600">+{remainingAdapters} more</span>}
          </div>
        </div>

        <span className="text-[11px] text-zinc-600">Click any domain above to isolate sources</span>
      </div>
    </div>
  );
}

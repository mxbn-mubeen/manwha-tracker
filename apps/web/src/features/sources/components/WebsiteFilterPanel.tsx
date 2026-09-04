import { X, Filter } from "lucide-react";
import { adapterDotColor } from "../utils/sourceHelpers";

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
  uniqueDomains, domainToAdapter, domainFilter, setDomainFilter,
  allCount, countForDomain, displayAdapters, remainingAdapters,
}: Props) {
  return (
    <div className="lg:col-span-3 bg-[#111214] border border-border/20 rounded-xl p-4 flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-4 border-b border-border/10 pb-3">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-zinc-400" />
          <h3 className="font-semibold text-zinc-200 text-sm">Filter by Website</h3>
          <span className="bg-[#161719] text-zinc-400 text-[11px] px-2 py-0.5 rounded-full border border-border/20">
            {uniqueDomains.length} domains
          </span>
        </div>
        {domainFilter && (
          <button onClick={() => setDomainFilter("")} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
            Clear filter <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <button
          onClick={() => setDomainFilter("")}
          className={`shrink-0 flex flex-col items-start px-4 py-2.5 rounded-lg border transition-all ${domainFilter === "" ? "border-amber-500/50 bg-amber-500/5" : "border-border/20 bg-[#161719] hover:bg-white/5"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${domainFilter === "" ? "bg-amber-500" : "bg-zinc-600"}`} />
            <span className={`text-sm font-medium ${domainFilter === "" ? "text-amber-50" : "text-zinc-300"}`}>All Sources</span>
          </div>
          <span className={`text-xs ${domainFilter === "" ? "text-amber-500/80" : "text-zinc-500"}`}>{allCount}</span>
        </button>

        {uniqueDomains.map(domain => {
          const isActive = domainFilter === domain;
          const dc = adapterDotColor(domainToAdapter[domain] ?? "generic");
          return (
            <button key={domain} onClick={() => setDomainFilter(isActive ? "" : domain)}
              className={`shrink-0 flex flex-col items-start px-4 py-2.5 rounded-lg border transition-all ${isActive ? "border-zinc-500/50 bg-white/5" : "border-border/20 bg-[#161719] hover:bg-white/5"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${dc}`} />
                <span className={`text-sm font-medium ${isActive ? "text-white" : "text-zinc-300"}`}>{domain}</span>
              </div>
              <span className={`text-xs ${isActive ? "text-zinc-400" : "text-zinc-500"}`}>{countForDomain(domain)}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex items-center gap-4 pt-3 border-t border-border/10 text-xs text-zinc-500">
        <span className="font-medium text-zinc-400">Adapter</span>
        <div className="flex flex-wrap gap-4 items-center">
          {displayAdapters.map(a => (
            <div key={a} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${adapterDotColor(a)}`} />
              <span className="capitalize">{a}</span>
            </div>
          ))}
          {remainingAdapters > 0 && <span>+{remainingAdapters} more</span>}
        </div>
      </div>
    </div>
  );
}

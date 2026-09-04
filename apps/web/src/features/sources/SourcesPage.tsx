import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Globe, MessageCircle, Layers } from "lucide-react";
import { SourceRow } from "./components/SourceRow";
import { SourceCard } from "./components/SourceCard";
import { WebsiteFilterPanel } from "./components/WebsiteFilterPanel";
import { TelegramPanel } from "./components/TelegramPanel";
import { FixAdapterKeysButton } from "./components/FixAdapterKeysButton";
import { getHost } from "./utils/sourceHelpers";

export function SourcesPage() {
  const [activeTab, setActiveTab] = useState<"website" | "telegram">("website");
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  const { data: sources, isLoading } = trpc.manhwa.getAllSources.useQuery();

  if (isLoading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!sources) return null;

  const websiteSources = sources.filter(s => s.type === 'website');
  const telegramSources = sources.filter(s => s.type === 'telegram');

  const filteredSources = sources.filter(s => {
    if (s.type !== activeTab) return false;
    const matchesSearch = s.manhwaTitle.toLowerCase().includes(searchQuery.toLowerCase()) || s.url.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'telegram') return matchesSearch;
    return matchesSearch && (domainFilter ? getHost(s.url) === domainFilter : true);
  });

  const uniqueDomains = Array.from(new Set(websiteSources.map(s => getHost(s.url)))).sort();
  const domainToAdapter: Record<string, string> = {};
  websiteSources.forEach(s => { domainToAdapter[getHost(s.url)] = s.adapterKey; });
  const uniqueAdapters = Array.from(new Set(Object.values(domainToAdapter))).sort();

  const statCount = activeTab === 'website' ? websiteSources.length : telegramSources.length;
  const statSecondary = activeTab === 'website' ? uniqueDomains.length : Array.from(new Set(telegramSources.map(s => s.url))).length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-20 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-bold tracking-tight text-white">Unified Sources</h1>
            <span className="text-xl">✨</span>
          </div>
          <p className="text-zinc-400 mt-0.5 text-sm">Manage and edit all your manhwa sources in one place.</p>
        </div>
        <FixAdapterKeysButton />
      </div>

      {/* Tab bar + search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mt-6">
        <div className="flex bg-[#161719] border border-border/20 p-1.5 rounded-xl gap-1">
          {(["website", "telegram"] as const).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setDomainFilter(""); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === tab ? "bg-amber-500 shadow-sm text-amber-950" : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"}`}
            >
              {tab === 'website' ? <Globe className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
              {tab === 'website' ? 'Websites' : 'Telegram'}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${activeTab === tab ? 'bg-amber-600/30 text-amber-950' : 'bg-white/10 text-zinc-300'}`}>
                {tab === 'website' ? websiteSources.length : telegramSources.length}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input type="text" placeholder="Search title or URL..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-12 h-10 w-full sm:w-[320px] bg-[#0c0d0f] border-border/30 text-white rounded-xl focus-visible:ring-1 focus-visible:ring-amber-500/50"
          />
          <div className="absolute right-3 top-2.5 text-[10px] font-mono text-zinc-500 border border-zinc-800 rounded px-1.5 py-0.5 bg-zinc-900/50">⌘K</div>
        </div>
      </div>

      {/* Stats + filter panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        <div className="grid grid-cols-2 gap-4 lg:col-span-1">
          <div className="bg-[#111214] border border-border/20 rounded-xl p-5 flex flex-col justify-between">
            <div className="bg-amber-500/10 text-amber-500 w-10 h-10 rounded-lg flex items-center justify-center mb-4 border border-amber-500/20"><Layers className="w-5 h-5" /></div>
            <div>
              <p className="text-zinc-500 text-[11px] font-medium mb-0.5 uppercase tracking-wider">Total Sources</p>
              <p className="text-3xl font-bold text-white tracking-tight">{statCount}</p>
              <p className="text-zinc-500 text-xs mt-1">{activeTab === 'website' ? 'Across all websites' : 'Telegram channels'}</p>
            </div>
          </div>
          <div className="bg-[#111214] border border-border/20 rounded-xl p-5 flex flex-col justify-between">
            <div className="bg-blue-500/10 text-blue-500 w-10 h-10 rounded-lg flex items-center justify-center mb-4 border border-blue-500/20"><Globe className="w-5 h-5" /></div>
            <div>
              <p className="text-zinc-500 text-[11px] font-medium mb-0.5 uppercase tracking-wider">{activeTab === 'website' ? 'Total Domains' : 'Unique Channels'}</p>
              <p className="text-3xl font-bold text-white tracking-tight">{statSecondary}</p>
              <p className="text-zinc-500 text-xs mt-1">{activeTab === 'website' ? 'Unique websites' : 'Distinct sources'}</p>
            </div>
          </div>
        </div>

        {activeTab === 'website' ? (
          <WebsiteFilterPanel
            uniqueDomains={uniqueDomains} domainToAdapter={domainToAdapter}
            domainFilter={domainFilter} setDomainFilter={setDomainFilter}
            allCount={websiteSources.length}
            countForDomain={d => websiteSources.filter(s => getHost(s.url) === d).length}
            displayAdapters={uniqueAdapters.slice(0, 5)}
            remainingAdapters={Math.max(0, uniqueAdapters.length - 5)}
          />
        ) : (
          <TelegramPanel telegramSources={telegramSources} />
        )}
      </div>

      {/* Desktop table */}
      <div className="border border-border/20 rounded-xl overflow-hidden bg-[#111214] hidden md:block mt-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm text-left">
            <thead className="text-[10px] tracking-wider uppercase bg-[#161719] text-zinc-500 border-b border-border/20 font-semibold">
              <tr>
                <th className="px-6 py-4 w-[250px] lg:w-[350px]">Manhwa Title <span className="ml-1 text-zinc-700">↕</span></th>
                <th className="px-6 py-4 w-[150px]">Adapter <span className="ml-1 text-zinc-700">↕</span></th>
                <th className="px-6 py-4 w-full">Source URL</th>
                <th className="px-6 py-4 text-right w-[150px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {filteredSources.length === 0
                ? <tr><td colSpan={4} className="px-6 py-16 text-center text-zinc-500">No sources found matching your filters.</td></tr>
                : filteredSources.map(source => <SourceRow key={source.id} source={source} />)
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {filteredSources.length === 0
          ? <div className="p-8 text-center text-zinc-500 border border-border/20 rounded-xl bg-[#111214]">No sources found matching your filters.</div>
          : filteredSources.map(source => <SourceCard key={source.id} source={source} />)
        }
      </div>
    </div>
  );
}

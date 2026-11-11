import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  Globe,
  Layers,
  Send,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { WebsiteFilterPanel } from "./components/WebsiteFilterPanel";
import { FixAdapterKeysButton } from "./components/FixAdapterKeysButton";
import { ManhwaSourcesView } from "./components/ManhwaSourcesView";
import { ProviderSourcesView } from "./components/ProviderSourcesView";
import { FlatTableSourcesView } from "./components/FlatTableSourcesView";
import { SourcesControlBar } from "./components/SourcesControlBar";
import { getHost } from "./utils/sourceHelpers";
import { search } from "@manhwa-tracker/utils";

export function SourcesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "website" | "telegram">("all");
  const [viewMode, setViewMode] = useState<"manhwa" | "provider" | "table">("manhwa");
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [showStats, setShowStats] = useState(false);

  const { data: sources, isLoading } = trpc.manhwa.getAllSources.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!sources) return null;

  const websiteSources = sources.filter((s) => s.type === "website");
  const telegramSources = sources.filter((s) => s.type === "telegram");

  const tabSources =
    activeTab === "all"
      ? sources
      : activeTab === "website"
      ? websiteSources
      : telegramSources;

  const searchResults = searchQuery.trim()
    ? search(tabSources, searchQuery, {
        fields: [
          { key: "manhwaTitle", weight: 1 },
          { key: "url", weight: 0.5 },
          { key: "adapterKey", weight: 0.3 },
        ],
      })
    : tabSources;

  const filteredSources = searchResults.filter((s) => {
    if (activeTab === "telegram" || !domainFilter) return true;
    return getHost(s.url) === domainFilter;
  });

  const uniqueDomains = Array.from(new Set(websiteSources.map((s) => getHost(s.url)))).sort();
  const domainToAdapter: Record<string, string> = {};
  websiteSources.forEach((s) => {
    domainToAdapter[getHost(s.url)] = s.adapterKey;
  });
  const uniqueAdapters = Array.from(new Set(Object.values(domainToAdapter))).sort();

  const uniqueManhwasCount = new Set(sources.map((s) => s.manhwaId)).size;
  const uniqueProvidersCount = uniqueAdapters.length + (telegramSources.length > 0 ? 1 : 0);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-20 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-bold tracking-tight text-white">Unified Sources</h1>
            <span className="text-xl">✨</span>
          </div>
          <p className="text-zinc-400 mt-0.5 text-sm">
            Manage, organize, and inspect all {sources.length} sources across {uniqueManhwasCount} tracked titles.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowStats((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 h-9 text-xs font-semibold rounded-xl border transition-all btn-press shadow-sm ${
              showStats
                ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-amber-500/10"
                : "bg-[#161719] hover:bg-[#202225] border-border/30 text-zinc-300 hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>{showStats ? "Hide Analytics" : "Show Analytics"}</span>
          </button>
          <FixAdapterKeysButton />
        </div>
      </div>

      {/* Analytics & Filters Drawer (collapsible to keep page clean) */}
      {showStats && (
        <div className="space-y-4 animate-panel-expand">
          {/* 4 Balanced Equal-Width Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sources */}
            <div
              className="bg-[#111214] border border-border/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm card-hover-lift animate-fade-up"
              style={{ '--i': 0 } as React.CSSProperties}
            >
              <div className="bg-amber-500/10 text-amber-400 w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-amber-500/20 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Total Sources</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">{sources.length}</p>
                <p className="text-zinc-400 text-xs mt-1 font-mono">{uniqueManhwasCount} titles tracked</p>
              </div>
            </div>

            {/* Websites */}
            <div
              className="bg-[#111214] border border-border/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm card-hover-lift animate-fade-up"
              style={{ '--i': 1 } as React.CSSProperties}
            >
              <div className="bg-amber-500/10 text-amber-400 w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-amber-500/20 shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Websites</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">{websiteSources.length}</p>
                <p className="text-zinc-400 text-xs mt-1 font-mono">{uniqueDomains.length} unique domains</p>
              </div>
            </div>

            {/* Telegram */}
            <div
              className="bg-[#111214] border border-border/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm card-hover-lift animate-fade-up"
              style={{ '--i': 2 } as React.CSSProperties}
            >
              <div className="bg-sky-500/10 text-sky-400 w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-sky-500/20 shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Telegram</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">{telegramSources.length}</p>
                <p className="text-zinc-400 text-xs mt-1 font-mono">Direct messenger channels</p>
              </div>
            </div>

            {/* Providers */}
            <div
              className="bg-[#111214] border border-border/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm card-hover-lift animate-fade-up"
              style={{ '--i': 3 } as React.CSSProperties}
            >
              <div className="bg-emerald-500/10 text-emerald-400 w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Active Providers</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-0.5">{uniqueProvidersCount}</p>
                <p className="text-zinc-400 text-xs mt-1 font-mono">{uniqueAdapters.length} scrapers + Telegram</p>
              </div>
            </div>
          </div>

          {/* Full-width Website Filter Panel */}
          <WebsiteFilterPanel
            uniqueDomains={uniqueDomains}
            domainToAdapter={domainToAdapter}
            domainFilter={domainFilter}
            setDomainFilter={setDomainFilter}
            allCount={websiteSources.length}
            countForDomain={(d) => websiteSources.filter((s) => getHost(s.url) === d).length}
            displayAdapters={uniqueAdapters.slice(0, 6)}
            remainingAdapters={Math.max(0, uniqueAdapters.length - 6)}
          />
        </div>
      )}

      {/* Control Bar: View Switcher + Source Type Tabs + Search */}
      <SourcesControlBar
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        uniqueManhwasCount={uniqueManhwasCount}
        uniqueProvidersCount={uniqueProvidersCount}
        totalCount={sources.length}
        websiteCount={websiteSources.length}
        telegramCount={telegramSources.length}
        onTabChange={() => setDomainFilter("")}
      />

      {/* Main Content Area based on View Mode */}
      {viewMode === "manhwa" && <ManhwaSourcesView sources={filteredSources} />}
      {viewMode === "provider" && <ProviderSourcesView sources={filteredSources} />}
      {viewMode === "table" && <FlatTableSourcesView sources={filteredSources} />}
    </div>
  );
}

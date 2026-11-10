import { Search, Globe, MessageCircle, BookOpen, Layers, Table as TableIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface SourcesControlBarProps {
  viewMode: "manhwa" | "provider" | "table";
  setViewMode: (mode: "manhwa" | "provider" | "table") => void;
  activeTab: "all" | "website" | "telegram";
  setActiveTab: (tab: "all" | "website" | "telegram") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  uniqueManhwasCount: number;
  uniqueProvidersCount: number;
  totalCount: number;
  websiteCount: number;
  telegramCount: number;
  onTabChange?: () => void;
}

export function SourcesControlBar({
  viewMode,
  setViewMode,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  uniqueManhwasCount,
  uniqueProvidersCount,
  totalCount,
  websiteCount,
  telegramCount,
  onTabChange,
}: SourcesControlBarProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-[#111214] border border-border/20 p-3 rounded-xl">
      {/* View Mode Switcher */}
      <div className="flex bg-[#161719] border border-border/20 p-1 rounded-lg gap-1 shrink-0 w-full sm:w-auto overflow-x-auto">
        <button
          onClick={() => setViewMode("manhwa")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            viewMode === "manhwa"
              ? "bg-amber-500 text-amber-950 font-semibold shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>By Manhwa</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
            {uniqueManhwasCount}
          </span>
        </button>
        <button
          onClick={() => setViewMode("provider")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            viewMode === "provider"
              ? "bg-amber-500 text-amber-950 font-semibold shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>By Provider</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
            {uniqueProvidersCount}
          </span>
        </button>
        <button
          onClick={() => setViewMode("table")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            viewMode === "table"
              ? "bg-amber-500 text-amber-950 font-semibold shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>Flat Table</span>
        </button>
      </div>

      {/* Source Type Filter & Search */}
      <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
        <div className="flex bg-[#161719] border border-border/20 p-1 rounded-lg gap-1 shrink-0">
          {(["all", "website", "telegram"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                onTabChange?.();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-all ${
                activeTab === tab
                  ? "bg-white/10 text-white font-semibold"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
            >
              {tab === "all" && "All"}
              {tab === "website" && (
                <>
                  <Globe className="w-3 h-3" />
                  <span>Websites</span>
                </>
              )}
              {tab === "telegram" && (
                <>
                  <MessageCircle className="w-3 h-3" />
                  <span>Telegram</span>
                </>
              )}
              <span className="text-[10px] text-zinc-500 font-mono">
                {tab === "all"
                  ? totalCount
                  : tab === "website"
                  ? websiteCount
                  : telegramCount}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search title, URL, provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-4 h-8 text-xs bg-[#161719] border-border/30 text-white rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500/50"
          />
        </div>
      </div>
    </div>
  );
}


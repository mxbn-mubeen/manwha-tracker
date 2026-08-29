import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Search, Wand2 } from "lucide-react";
import { SourceRow } from "./components/SourceRow";
import { SourceCard } from "./components/SourceCard";
import { getAdapterBadgeClass } from "./utils/adapterColors";

export function SourcesPage() {
  const [activeTab, setActiveTab] = useState<"website" | "telegram">("website");
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  
  const { data: sources, isLoading } = trpc.manhwa.getAllSources.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sources) return null;

  /** Extract hostname safely, fallback to full url */
  function getHost(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
  }

  const filteredSources = sources.filter((s) => {
    if (s.type !== activeTab) return false;
    const matchesSearch = s.manhwaTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.url.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'telegram') return matchesSearch;
    
    const matchesDomain = domainFilter ? getHost(s.url) === domainFilter : true;
    return matchesSearch && matchesDomain;
  });

  // Unique domains for website sources, sorted alphabetically
  const uniqueDomains = Array.from(
    new Set(sources.filter(s => s.type === 'website').map(s => getHost(s.url)))
  ).sort();

  // For each domain, figure out the adapter key (for badge colouring)
  const domainToAdapter: Record<string, string> = {};
  sources.filter(s => s.type === 'website').forEach(s => {
    domainToAdapter[getHost(s.url)] = s.adapterKey;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Sources</h1>
          <p className="text-muted-foreground">Manage and edit all your manhwa sources in one place.</p>
        </div>
        <FixAdapterKeysButton />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex bg-[#161719] border border-border/30 p-1 rounded-lg">
          <button
            onClick={() => { setActiveTab("website"); setDomainFilter(""); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "website" ? "bg-amber-500 shadow-sm text-amber-950" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Websites
          </button>
          <button
            onClick={() => { setActiveTab("telegram"); setDomainFilter(""); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === "telegram" ? "bg-amber-500 shadow-sm text-amber-950" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Telegram
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search title or url..."
            className="pl-9 w-full sm:w-[250px] bg-[#161719] border-border/50 text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Website domain filter chips — shown only on Websites tab */}
      {activeTab === 'website' && uniqueDomains.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDomainFilter("")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              domainFilter === ""
                ? "bg-amber-500 border-amber-500 text-amber-950"
                : "bg-transparent border-border/40 text-zinc-400 hover:text-white hover:border-border/70"
            }`}
          >
            All
          </button>
          {uniqueDomains.map(domain => {
            const adapter = domainToAdapter[domain] ?? "generic";
            const count = sources.filter(s => s.type === 'website' && getHost(s.url) === domain).length;
            return (
              <button
                key={domain}
                onClick={() => setDomainFilter(domainFilter === domain ? "" : domain)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                  domainFilter === domain
                    ? getAdapterBadgeClass(adapter) + " ring-1 ring-offset-1 ring-offset-[#0c0d0f] ring-current"
                    : "bg-transparent border-border/40 text-zinc-400 hover:text-white hover:border-border/70"
                }`}
              >
                {domain}
                <span className="opacity-60 font-normal">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="border border-border/30 rounded-lg overflow-hidden bg-[#161719] hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-zinc-300">
            <thead className="text-xs uppercase bg-[#0e0f11] text-muted-foreground border-b border-border/30">
              <tr>
                <th className="px-6 py-3 font-medium">Manhwa Title</th>
                <th className="px-6 py-3 font-medium">Adapter</th>
                <th className="px-6 py-3 font-medium min-w-[300px]">URL</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredSources.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No sources found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredSources.map((source) => (
                  <SourceRow key={source.id} source={source} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredSources.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground border border-border/30 rounded-lg bg-[#161719]">
            No sources found matching your filters.
          </div>
        ) : (
          filteredSources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))
        )}
      </div>
    </div>
  );
}

function FixAdapterKeysButton() {
  const utils = trpc.useUtils();
  const mutation = trpc.manhwa.redetectAdapterKeys.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ Fixed adapter keys for ${data.fixed} sources`);
      utils.manhwa.getAllSources.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 shrink-0"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      title="Re-detect adapter keys for all website sources (fixes 'website' badge)"
    >
      {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">Fix Adapters</span>
    </Button>
  );
}

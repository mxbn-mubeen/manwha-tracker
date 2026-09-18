import { Link, useLocation } from "react-router-dom"
import { RefreshCw, Plus, Settings, History, Search, Globe, BarChart3, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { useState, useEffect } from "react"
import { SyncHistoryDrawer } from "@/features/sync/SyncHistoryDrawer"
import { GlobalSearch } from "@/features/search/GlobalSearch"

export function Navbar() {
  const location = useLocation()
  const utils = trpc.useUtils()

  const [historyOpen, setHistoryOpen] = useState(false)
  const [searchOpen, setSearchOpen]   = useState(false)

  // Cmd+K / Ctrl+K opens global search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const syncMutation = trpc.sync.run.useMutation({
    onSuccess: async (result) => {
      await utils.manhwa.getAll.invalidate()
      if (!result) {
        toast.info('Sync is still running in the background. Check Sync History for results.')
        return
      }
      if ((result as any).startedAsync) {
        toast.info('🔄 Sync started in the background. The Syncing indicator will clear when done.')
        return
      }
      if (result.errors.length > 0) {
        const maxErrors = 3;
        const displayErrors = result.errors.slice(0, maxErrors);
        const hasMore = result.errors.length > maxErrors;
        const errorDescription = (
          <div className="mt-1 flex flex-col gap-1 text-xs">
            <ul className="space-y-0.5">
              {displayErrors.map((e: string, i: number) => (
                <li key={i} className="truncate opacity-90">{e}</li>
              ))}
            </ul>
            {hasMore && <span className="opacity-70 mt-0.5 italic">...and {result.errors.length - maxErrors} more. Check Sync History for full details.</span>}
          </div>
        )
        toast.warning(
          `Sync finished with ${result.errors.length} issue(s). Found ${result.newChapters} new chapter(s).`,
          { description: errorDescription, duration: 5000 }
        )
      } else if (result.newChapters > 0) {
        toast.success(`Sync complete! Found ${result.newChapters} new chapter(s) across ${result.updatedManhwa} title(s).`)
      } else {
        toast.success(`Sync complete! Scanned ${result.scannedSources} source(s) — no new chapters.`)
      }
    },
    onError: (err) => {
      toast.error("Sync failed", { description: err.message })
    },
  })

  const handleSync = (forceFullRefresh: boolean = false) => {
    if (syncMutation.isPending || serverIsSyncing) return;
    syncMutation.mutate({ scope: "all", forceFullRefresh })
    setSyncMenuOpen(false);
  };

  const [syncMenuOpen, setSyncMenuOpen] = useState(false);

  const { data: serverIsSyncing = false } = trpc.sync.isSyncing.useQuery(undefined, {
    refetchInterval: 2000,
  });

  const { data: syncProgress } = trpc.sync.getProgress.useQuery(undefined, {
    refetchInterval: serverIsSyncing ? 2000 : false,
    enabled: serverIsSyncing,
  });

  const isSyncing = syncMutation.isPending || serverIsSyncing;

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8 justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
              <div className="bg-amber-500 text-amber-950 font-bold h-8 w-8 flex items-center justify-center rounded-md shrink-0">
                M
              </div>
              <span className="font-bold text-lg hidden sm:inline-block">Manhwa</span>
            </Link>
            
            <nav className="flex items-center gap-1 sm:gap-4 text-sm font-medium text-muted-foreground shrink-0">
              <Link 
                to="/dashboard" 
                className={`transition-colors hover:text-foreground shrink-0 ${location.pathname === '/dashboard' ? 'text-foreground bg-white/5 px-2 sm:px-3 py-1.5 rounded-md' : 'px-2 sm:px-3 py-1.5'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="grid grid-cols-2 gap-0.5 w-4 h-4 shrink-0">
                    <div className="bg-current rounded-[1px]" />
                    <div className="bg-current rounded-[1px]" />
                    <div className="bg-current rounded-[1px]" />
                    <div className="bg-current rounded-[1px]" />
                  </span>
                  <span className="hidden sm:inline">Dashboard</span>
                </div>
              </Link>
              <Link 
                to="/library" 
                className={`transition-colors hover:text-foreground shrink-0 ${location.pathname === '/library' ? 'text-foreground bg-white/5 px-2 sm:px-3 py-1.5 rounded-md' : 'px-2 sm:px-3 py-1.5'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0">|\</span>
                  <span className="hidden sm:inline">Library</span>
                </div>
              </Link>
              <Link 
                to="/sources" 
                className={`transition-colors hover:text-foreground shrink-0 ${location.pathname === '/sources' ? 'text-foreground bg-white/5 px-2 sm:px-3 py-1.5 rounded-md' : 'px-2 sm:px-3 py-1.5'}`}
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Sources</span>
                </div>
              </Link>
              <Link 
                to="/stats" 
                className={`transition-colors hover:text-foreground shrink-0 ${location.pathname === '/stats' ? 'text-foreground bg-white/5 px-2 sm:px-3 py-1.5 rounded-md' : 'px-2 sm:px-3 py-1.5'}`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Stats</span>
                </div>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="flex gap-2 px-2 sm:px-3 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline text-xs text-zinc-600 border border-border/40 rounded px-1.5 py-0.5 font-mono">⌘K</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setHistoryOpen(true)}
              title="Sync history"
            >
              <History className="h-4 w-4 shrink-0" />
            </Button>

            <div
              className="relative flex shrink-0"
              tabIndex={-1}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setSyncMenuOpen(false);
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="flex gap-2 px-2 sm:px-3 rounded-r-none shrink-0"
                onClick={() => handleSync(false)}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className={isSyncing ? "inline text-xs sm:text-sm whitespace-nowrap" : "hidden sm:inline whitespace-nowrap"}>
                  {isSyncing
                    ? syncProgress
                      ? `Syncing ${syncProgress.completed}/${syncProgress.total}…`
                      : 'Syncing…'
                    : 'Sync'
                  }
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-6 rounded-l-none border-l border-border/30 shrink-0"
                onClick={() => setSyncMenuOpen((o) => !o)}
                disabled={isSyncing}
                aria-label="More sync options"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
              {syncMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border/30 bg-[#161719] shadow-lg z-[200] py-1">
                  <button
                    onClick={() => handleSync(true)}
                    disabled={isSyncing}
                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="font-medium">🔄 Full Refresh</div>
                    <div className="text-xs text-zinc-500 mt-0.5">Bypasses cadence — checks every source</div>
                  </button>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 rounded-full shrink-0 ${location.pathname === '/settings' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              asChild
            >
              <Link to="/settings" aria-label="Settings">
                <Settings className="h-4 w-4 shrink-0" />
              </Link>
            </Button>

            <Button size="sm" className="gap-2 rounded-full px-3 sm:px-4 shrink-0" asChild>
              <Link to="/add">
                <Plus className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">Add Manhwa</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <SyncHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}

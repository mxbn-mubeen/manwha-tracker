import { Link, useLocation } from "react-router-dom"
import { RefreshCw, Plus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}

function Navbar() {
  const location = useLocation()
  const utils = trpc.useUtils()

  const syncMutation = trpc.sync.run.useMutation({
    onSuccess: async (result) => {
      // Refresh library/dashboard data so any newly-discovered chapters show up
      await utils.manhwa.getAll.invalidate()

      if (result.errors.length > 0) {
        // Show all errors — each on its own line so every failing title is
        // visible, not just the first one.
        const errorDescription = (
          <ul className="mt-1 space-y-0.5 text-xs">
            {result.errors.map((e, i) => (
              <li key={i} className="truncate opacity-90">{e}</li>
            ))}
          </ul>
        )
        toast.warning(
          `Sync finished with ${result.errors.length} issue(s). Found ${result.newChapters} new chapter(s).`,
          { description: errorDescription }
        )
      } else if (result.newChapters > 0) {
        toast.success(
          `Sync complete! Found ${result.newChapters} new chapter(s) across ${result.updatedManhwa} title(s).`
        )
      } else {
        toast.success(`Sync complete! Scanned ${result.scannedSources} source(s) — no new chapters.`)
      }
    },
    onError: (err) => {
      toast.error("Sync failed", { description: err.message })
    },
  })

  const handleSync = () => {
    syncMutation.mutate({ scope: "all" })
  };

  const isSyncing = syncMutation.isPending;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8 justify-between">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="bg-amber-500 text-amber-950 font-bold h-8 w-8 flex items-center justify-center rounded-md shrink-0">
              M
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">Manhwa</span>
          </Link>
          
          <nav className="flex items-center gap-1 sm:gap-4 text-sm font-medium text-muted-foreground">
            <Link 
              to="/dashboard" 
              className={`transition-colors hover:text-foreground ${location.pathname === '/dashboard' ? 'text-foreground bg-white/5 px-2 sm:px-3 py-1.5 rounded-md' : 'px-2 sm:px-3 py-1.5'}`}
            >
              <div className="flex items-center gap-2">
                <span className="grid grid-cols-2 gap-0.5 w-4 h-4">
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
              className={`transition-colors hover:text-foreground ${location.pathname === '/library' ? 'text-foreground bg-white/5 px-2 sm:px-3 py-1.5 rounded-md' : 'px-2 sm:px-3 py-1.5'}`}
            >
              <div className="flex items-center gap-2">
                <span>|\</span>
                <span className="hidden sm:inline">Library</span>
              </div>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex gap-2 px-2 sm:px-3"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-9 w-9 rounded-full shrink-0 ${location.pathname === '/settings' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            asChild
          >
            <Link to="/settings" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="sm" className="gap-2 rounded-full px-3 sm:px-4" asChild>
            <Link to="/add">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Manhwa</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

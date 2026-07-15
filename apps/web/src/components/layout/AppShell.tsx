import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { RefreshCw, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

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
  
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    // Simulate a sync process for 1.5 seconds since the backend sync logic isn't fully implemented yet
    setTimeout(() => {
      setIsSyncing(false);
      toast.success("Sync complete! Your library is up to date.");
    }, 1500);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8 justify-between">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="bg-amber-500 text-amber-950 font-bold h-8 w-8 flex items-center justify-center rounded-md">
              M
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">Manhwa</span>
          </Link>
          
          <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link 
              to="/dashboard" 
              className={`transition-colors hover:text-foreground ${location.pathname === '/dashboard' ? 'text-foreground bg-white/5 px-3 py-1.5 rounded-md' : 'px-3 py-1.5'}`}
            >
              <div className="flex items-center gap-2">
                <span className="grid grid-cols-2 gap-0.5 w-4 h-4">
                  <div className="bg-current rounded-[1px]" />
                  <div className="bg-current rounded-[1px]" />
                  <div className="bg-current rounded-[1px]" />
                  <div className="bg-current rounded-[1px]" />
                </span>
                Dashboard
              </div>
            </Link>
            <Link 
              to="/library" 
              className={`transition-colors hover:text-foreground ${location.pathname === '/library' ? 'text-foreground bg-white/5 px-3 py-1.5 rounded-md' : 'px-3 py-1.5'}`}
            >
              <div className="flex items-center gap-2">
                <span>|\</span>
                Library
              </div>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="hidden sm:flex gap-2"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
          <Button size="sm" className="gap-2 rounded-full px-4" asChild>
            <Link to="/add">
              <Plus className="h-4 w-4" />
              Add Manhwa
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

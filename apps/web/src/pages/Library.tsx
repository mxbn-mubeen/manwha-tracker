import { useState } from 'react';
import { Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function LibraryPage() {
  const { data: manhwas, isLoading } = trpc.manhwa.getAll.useQuery();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Reading' | 'Unread' | 'Completed' | 'Hiatus'>('All');

  const filtered = manhwas?.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());
    
    let matchesFilter = true;
    if (filter === 'Reading') {
      matchesFilter = m.status === 'ongoing';
    } else if (filter === 'Completed') {
      matchesFilter = m.status === 'completed';
    } else if (filter === 'Hiatus') {
      matchesFilter = m.status === 'hiatus';
    } else if (filter === 'Unread') {
      const unread = (m.progress?.latestChapter ?? 0) - (m.progress?.lastChapter ?? 0);
      matchesFilter = unread > 0;
    }
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Library</h1>
        <p className="text-muted-foreground">{manhwas?.length ?? 0} titles in your collection</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search titles..." 
            className="pl-9 bg-card border-border/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {(['All', 'Reading', 'Unread', 'Completed', 'Hiatus'] as const).map(f => (
            <Button 
              key={f}
              variant={filter === f ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f ? 'bg-amber-500 text-amber-950 hover:bg-amber-500/90' : 'bg-card hover:bg-card/80'}
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
          {filtered.map((m) => {
            const unread = (m.progress?.latestChapter ?? 0) - (m.progress?.lastChapter ?? 0);
            return (
              <Link to={`/manhwa/${m.id}`} key={m.id} className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-zinc-900 border border-border/50 transition-all hover:border-amber-500/50 hover:glow block">
                {m.coverUrl ? (
                  <img src={m.coverUrl} alt={m.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-600 text-xs font-medium">NO COVER</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                
                {unread > 0 && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-amber-500 text-amber-950 font-bold border-none shadow-md">
                      +{unread}
                    </Badge>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-white">{m.title}</h3>
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Ch. {m.progress?.lastChapter ?? 0}</span>
                    <span>/ {m.progress?.latestChapter ?? 0}</span>
                  </div>
                  <div className="mt-2 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full" 
                      style={{ width: `${Math.min(100, Math.max(0, ((m.progress?.lastChapter ?? 0) / Math.max(1, (m.progress?.latestChapter ?? 1))) * 100))}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-muted-foreground">
            <Search size={24} />
          </div>
          <h3 className="text-lg font-medium mb-1">No manhwa found</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            {search ? `We couldn't find anything matching "${search}".` : "Your library is empty. Start by adding a manhwa."}
          </p>
          {!search && (
            <Button asChild className="bg-amber-500 text-amber-950 hover:bg-amber-500/90">
              <Link to="/add">Add Manhwa</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

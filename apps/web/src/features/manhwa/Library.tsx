import { useState } from 'react';
import { Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useSearchParams } from 'react-router-dom';
import { ManhwaCard } from '@/features/manhwa/components/ManhwaCard';

type FilterValue = 'All' | 'Reading' | 'Unread' | 'Completed' | 'Hiatus' | 'Dropped';
const FILTER_VALUES: readonly FilterValue[] = ['All', 'Reading', 'Unread', 'Completed', 'Hiatus', 'Dropped'];

export function LibraryPage() {
  const { data: manhwas, isLoading } = trpc.manhwa.getAll.useQuery();
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const filterParam = searchParams.get('filter');
  const filter: FilterValue = FILTER_VALUES.includes(filterParam as FilterValue)
    ? (filterParam as FilterValue)
    : 'All';

  const applyFilter = (f: FilterValue) => {
    setSearchParams(f === 'All' ? {} : { filter: f });
  };

  const filtered = manhwas?.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(search.toLowerCase());

    let matchesFilter = true;
    if (filter === 'Reading') {
      matchesFilter = m.status === 'ongoing';
    } else if (filter === 'Completed') {
      matchesFilter = m.status === 'completed';
    } else if (filter === 'Hiatus') {
      matchesFilter = m.status === 'hiatus';
    } else if (filter === 'Dropped') {
      matchesFilter = m.status === 'dropped';
    } else if (filter === 'Unread') {
      const unread =
        (m.progress?.latestChapter ?? 0) -
        (m.progress?.lastChapter ?? 0);

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
          {(['All', 'Reading', 'Unread', 'Completed', 'Hiatus', 'Dropped'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'secondary'}
              size="sm"
              onClick={() => applyFilter(f)}
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
          {filtered.map((m) => (
            <ManhwaCard key={m.id} manhwa={m} />
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-muted-foreground">
            <Search size={24} />
          </div>
          <h3 className="text-lg font-medium mb-1">No manhwa found</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            {search
              ? `We couldn't find anything matching "${search}".`
              : filter !== 'All'
              ? `No manhwa match the "${filter}" filter.`
              : "Your library is empty. Start by adding a manhwa."}
          </p>
          {!search && filter === 'All' && (
            <Button asChild className="bg-amber-500 text-amber-950 hover:bg-amber-500/90">
              <Link to="/add">Add Manhwa</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
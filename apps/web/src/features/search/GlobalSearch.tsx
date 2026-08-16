import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Search, X, BookOpen } from 'lucide-react';
import { getProxiedImageUrl } from '@/utils/image';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: all = [] } = trpc.manhwa.getAll.useQuery();

  const results = query.trim().length < 1 ? [] : all.filter(m =>
    m.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  const handleSelect = (id: number) => {
    navigate(`/manhwa/${id}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl mx-4 bg-[#111213] border border-border/40 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30">
          <Search className="h-4 w-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search manhwa..."
            className="flex-1 bg-transparent text-white placeholder:text-zinc-600 text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-zinc-600 hover:text-zinc-400">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-600 border border-border/40 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul 
            className="max-h-[50vh] overflow-y-auto py-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {results.map(m => {
              const behind = (m.progress?.latestChapter ?? 0) - (m.progress?.lastChapter ?? 0);
              return (
                <li key={m.id}>
                  <button
                    onClick={() => handleSelect(m.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors text-left group"
                  >
                    {m.coverUrl ? (
                      <img
                        src={getProxiedImageUrl(m.coverUrl) as string}
                        alt={m.title}
                        className="h-10 w-7 object-cover rounded shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-7 bg-zinc-800 rounded shrink-0 flex items-center justify-center">
                        <BookOpen className="h-3.5 w-3.5 text-zinc-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white group-hover:text-amber-300 transition-colors truncate font-medium">
                        {m.title}
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Ch. {m.progress?.lastChapter ?? 0} / {m.progress?.latestChapter ?? '?'}
                        {behind > 0 && (
                          <span className="ml-2 text-amber-500">+{behind} unread</span>
                        )}
                      </p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize shrink-0 font-medium ${
                      m.status.toLowerCase() === 'ongoing' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                      m.status.toLowerCase() === 'hiatus' ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' :
                      m.status.toLowerCase() === 'completed' ? 'text-purple-400 bg-purple-400/10 border-purple-400/20' :
                      m.status.toLowerCase() === 'dropped' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                      'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
                    }`}>
                      {m.status}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : query.length > 0 ? (
          <div className="py-10 text-center text-zinc-600 text-sm">
            No results for <span className="text-zinc-400">"{query}"</span>
          </div>
        ) : (
          <div className="py-6 text-center text-zinc-700 text-xs">
            Start typing to search your library
          </div>
        )}
      </div>
    </div>
  );
}

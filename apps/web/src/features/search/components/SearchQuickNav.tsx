import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Globe,
  BarChart3,
  Settings,
  Plus,
} from 'lucide-react';
import { getUnreadCount, formatUnreadCount } from '@/lib/utils';
import { ManhwaCoverImage } from '@/features/sources/components/ManhwaCoverImage';
import type { RouterOutputs } from '@/lib/trpc';

type Manhwa = RouterOutputs['manhwa']['getAll'][number];

export const NAV_PAGES = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, desc: 'Overview & continue reading' },
  { title: 'Library', path: '/library', icon: BookOpen, desc: 'All tracked manhwa series' },
  { title: 'Sources', path: '/sources', icon: Globe, desc: 'Providers, channels & URLs' },
  { title: 'Analytics & Stats', path: '/stats', icon: BarChart3, desc: 'Collection stats & breakdown' },
  { title: 'Settings', path: '/settings', icon: Settings, desc: 'Telegram bot & system config' },
  { title: 'Add Manhwa', path: '/add', icon: Plus, desc: 'Track a new title' },
];

interface SearchQuickNavProps {
  selectedIndex: number;
  suggestions: Manhwa[];
  onSelect: () => void;
}

export function SearchQuickNav({ selectedIndex, suggestions, onSelect }: SearchQuickNavProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 p-1">
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-2">
          Quick Navigation
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {NAV_PAGES.map((p, idx) => {
            const isSelected = selectedIndex === idx;
            const Icon = p.icon;
            return (
              <button
                key={p.path}
                onClick={() => { navigate(p.path); onSelect(); }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                  isSelected ? 'bg-amber-500/15 border-amber-500/30' : 'bg-[#161719]/60 hover:bg-[#161719] border-border/20'
                }`}
              >
                <Icon className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-zinc-200 truncate">{p.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-1 mb-2">
            Continue Reading Suggestions
          </p>
          <div className="space-y-1">
            {suggestions.map((m, idx) => {
              const itemIdx = 3 + idx;
              const isSelected = selectedIndex === itemIdx;
              const behind = getUnreadCount(m.progress?.latestChapter, m.progress?.lastChapter);
              return (
                <button
                  key={m.id}
                  onClick={() => { navigate(`/manhwa/${m.id}`); onSelect(); }}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all text-left ${
                    isSelected ? 'bg-amber-500/15 border border-amber-500/30' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="h-9 w-7 rounded overflow-hidden bg-zinc-900 border border-border/30 shrink-0">
                    <ManhwaCoverImage src={m.coverUrl} alt={m.title} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{m.title}</p>
                    <p className="text-[11px] text-amber-400 font-medium">+{formatUnreadCount(behind)} new chapters</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


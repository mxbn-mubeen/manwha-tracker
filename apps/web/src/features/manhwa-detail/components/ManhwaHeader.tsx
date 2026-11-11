import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { ManhwaCadenceInfo } from './ManhwaCadenceInfo';
import { ChapterQuickEdit } from './ChapterQuickEdit';
import { getGenreBadgeClass } from '@/utils/genreColors';

export interface CadenceInfo {
  insufficientData: boolean;
  isIrregular: boolean;
  isOverdue: boolean;
  nextExpectedTime: number | null;
  lastPublishedAt: string | null;
}

interface ManhwaHeaderProps {
  id: number;
  title: string;
  status: string | null;
  genres: string[] | null;
  description: string | null;
  latestChapter: number;
  cadenceInfo?: CadenceInfo | null;
}

const STATUS_DOT_COLOR: Record<string, string> = {
  ongoing: 'bg-emerald-400',
  hiatus: 'bg-amber-400',
  completed: 'bg-purple-400',
  dropped: 'bg-red-400',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  ongoing: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
  hiatus: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  completed: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
  dropped: 'border-red-500/30 text-red-400 bg-red-500/10',
};

export function ManhwaHeader({
  id,
  title,
  status,
  genres,
  description,
  latestChapter,
  cadenceInfo,
}: ManhwaHeaderProps) {
  const utils = trpc.useUtils();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateStatusMutation = trpc.manhwa.updateStatus.useMutation({
    onSuccess: () => {
      utils.manhwa.getById.invalidate(id);
      utils.manhwa.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Failed to update status'),
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentStatus = status || 'ongoing';
  const statuses = ['ongoing', 'hiatus', 'completed', 'dropped'];

  return (
    <div className="space-y-4">
      {/* ── Metadata Row: Status Badge & ID ── */}
      <div className="flex items-center gap-2.5 relative" ref={dropdownRef}>
        {/* Status Dropdown Trigger */}
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border transition-all btn-press ${
            STATUS_BADGE_CLASS[currentStatus] ?? 'border-border/30 text-zinc-300 bg-[#161719]'
          }`}
          title="Click to change reading status"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                STATUS_DOT_COLOR[currentStatus] ?? 'bg-emerald-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                STATUS_DOT_COLOR[currentStatus] ?? 'bg-emerald-400'
              }`}
            />
          </span>
          <span>{currentStatus}</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-200 ${
              dropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <span className="text-[11px] font-mono text-zinc-500 bg-[#161719] border border-border/20 px-2 py-0.5 rounded-full">
          ID #{id}
        </span>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-40 bg-[#161719] border border-border/40 rounded-xl shadow-2xl py-1 z-50 overflow-hidden backdrop-blur-xl animate-card-enter">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  updateStatusMutation.mutate({
                    id,
                    status: s as 'ongoing' | 'completed' | 'hiatus' | 'dropped',
                  });
                  setDropdownOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-colors flex items-center gap-2.5 ${
                  s === currentStatus ? 'text-white bg-white/5' : 'text-zinc-400'
                }`}
              >
                <div
                  className={`h-2 w-2 rounded-full ${
                    STATUS_DOT_COLOR[s] ?? 'bg-emerald-400'
                  }`}
                />
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Title ── */}
      <div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
          {title}
        </h1>
      </div>

      {/* ── Genres: Colorful, Interactive Filter Pills ── */}
      {genres && genres.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {genres.map((tag: string) => {
            const { container, dot } = getGenreBadgeClass(tag);
            return (
              <Link
                key={tag}
                to={`/library?search=${encodeURIComponent(tag)}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 btn-press card-hover-lift ${container}`}
                title={`Filter library by ${tag}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                <span>{tag}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Description with Read More / Read Less ── */}
      {description && (
        <div className="space-y-1 text-sm text-zinc-400 leading-relaxed max-w-3xl">
          <p className={descExpanded ? '' : 'line-clamp-3'}>{description}</p>
          {description.length > 220 && (
            <button
              type="button"
              onClick={() => setDescExpanded((v) => !v)}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors pt-0.5 cursor-pointer block"
            >
              {descExpanded ? 'Show less ▲' : 'Read more ▼'}
            </button>
          )}
        </div>
      )}

      {/* ── Cadence & Latest Chapter — single compact row ── */}
      <div className="flex flex-col items-start gap-2 pt-1">
        <ManhwaCadenceInfo cadenceInfo={cadenceInfo} />
        <ChapterQuickEdit id={id} latestChapter={latestChapter} />
      </div>
    </div>
  );
}

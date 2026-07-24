import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface ManhwaHeaderProps {
  id: number;
  title: string;
  status: string | null;
  genres: string[] | null;
  description: string | null;
  latestChapter: number;
}

const STATUS_DOT_COLOR: Record<string, string> = {
  ongoing: 'bg-green-500',
  hiatus: 'bg-yellow-500',
  completed: 'bg-blue-500',
  dropped: 'bg-red-500',
};

export function ManhwaHeader({ id, title, status, genres, description, latestChapter }: ManhwaHeaderProps) {
  const utils = trpc.useUtils();

  const updateStatusMutation = trpc.manhwa.updateStatus.useMutation({
    onSuccess: () => utils.manhwa.getById.invalidate(id),
    onError: (err) => toast.error(err.message || 'Failed to update status'),
  });

  const updateLatestChapterMutation = trpc.manhwa.updateLatestChapter.useMutation({
    onSuccess: () => {
      utils.manhwa.getById.invalidate(id);
      utils.manhwa.getAll.invalidate();
      setIsEditingChapter(false);
    },
    onError: (err) => toast.error(err.message || 'Failed to update latest chapter'),
  });

  const [isEditingChapter, setIsEditingChapter] = useState(false);
  const [chapterInput, setChapterInput] = useState(String(latestChapter));

  const currentStatus = status || 'ongoing';

  const startEditingChapter = () => {
    setChapterInput(String(latestChapter));
    setIsEditingChapter(true);
  };

  const submitChapterEdit = () => {
    const parsed = Number(chapterInput);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error('Enter a valid chapter number');
      return;
    }
    updateLatestChapterMutation.mutate({ id, chapterNum: parsed });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className={`h-2 w-2 rounded-full ${STATUS_DOT_COLOR[currentStatus] ?? 'bg-green-500'}`}></div>
        <select
          value={currentStatus}
          onChange={(e) => updateStatusMutation.mutate({ id, status: e.target.value as 'ongoing' | 'completed' | 'hiatus' | 'dropped' })}
          className="text-xs font-semibold tracking-wider text-muted-foreground uppercase bg-transparent border-none focus:outline-none cursor-pointer hover:text-white transition-colors"
        >
          <option value="ongoing">ONGOING</option>
          <option value="hiatus">HIATUS</option>
          <option value="completed">COMPLETED</option>
          <option value="dropped">DROPPED</option>
        </select>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-1">{title}</h1>
      <p className="text-xs text-muted-foreground/50 mb-3 font-mono">ID #{id}</p>

      {genres && genres.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {genres.map((tag: string) => (
            <Badge key={tag} variant="secondary" className="bg-[#1e1f22] hover:bg-[#2a2b2f] text-muted-foreground font-normal border-border/40 px-3">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {description && (
        <p className="text-muted-foreground leading-relaxed mb-4">
          {description}
        </p>
      )}

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Latest chapter:</span>
        {isEditingChapter ? (
          <>
            <input
              type="number"
              step="0.1"
              autoFocus
              value={chapterInput}
              onChange={(e) => setChapterInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitChapterEdit();
                if (e.key === 'Escape') setIsEditingChapter(false);
              }}
              className="w-20 bg-[#0e0f11] border border-border/50 text-white text-sm rounded-md px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              onClick={submitChapterEdit}
              disabled={updateLatestChapterMutation.isPending}
              className="text-green-500 hover:text-green-400"
              aria-label="Save latest chapter"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsEditingChapter(false)}
              className="text-muted-foreground hover:text-white"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <span className="font-semibold text-white">{latestChapter}</span>
            <button
              onClick={startEditingChapter}
              className="text-muted-foreground hover:text-white"
              aria-label="Edit latest chapter"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
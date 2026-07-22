import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface ManhwaHeaderProps {
  id: number;
  title: string;
  status: string | null;
  genres: string[] | null;
  description: string | null;
}

export function ManhwaHeader({ id, title, status, genres, description }: ManhwaHeaderProps) {
  const utils = trpc.useUtils();
  
  const updateStatusMutation = trpc.manhwa.updateStatus.useMutation({
    onSuccess: () => utils.manhwa.getById.invalidate(id),
    onError: () => toast.error('Failed to update status'),
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-2 w-2 rounded-full bg-green-500"></div>
        <select
          value={status || 'ongoing'}
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
        <p className="text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

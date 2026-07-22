import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function AddManhwaForm() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [tags, setTags] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [status, setStatus] = useState<'ongoing' | 'completed' | 'hiatus' | 'dropped'>('ongoing');
  const [lastChapter, setLastChapter] = useState('');
  const [latestChapter, setLatestChapter] = useState('');
  const [description, setDescription] = useState('');

  const addMutation = trpc.manhwa.create.useMutation({
    onSuccess: () => {
      toast.success('Manhwa added successfully');
      utils.manhwa.getAll.invalidate();
      navigate('/library');
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    const parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    const parsedLastChapter = lastChapter === '' ? undefined : parseInt(lastChapter, 10);
    const parsedLatestChapter = latestChapter === '' ? undefined : parseInt(latestChapter, 10);
    
    addMutation.mutate({
      title,
      coverUrl: coverUrl || undefined,
      description: description || undefined,
      genres: parsedTags.length > 0 ? parsedTags : undefined,
      status,
      lastChapter: isNaN(parsedLastChapter as number) ? undefined : parsedLastChapter,
      latestChapter: isNaN(parsedLatestChapter as number) ? undefined : parsedLatestChapter,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Title *</label>
        <Input 
          placeholder="The Beginning After The End" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-[#0e0f11] border-border/50 text-white h-11"
          required
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">Author</label>
          <Input 
            placeholder="TurtleMe" 
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="bg-[#0e0f11] border-border/50 text-white h-11"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">Tags (comma separated)</label>
          <Input 
            placeholder="Fantasy, Action" 
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="bg-[#0e0f11] border-border/50 text-white h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="manhwa-status" className="text-sm font-medium text-white">Status</label>
          <select
            id="manhwa-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="flex w-full rounded-md border border-border/50 bg-[#0e0f11] px-3 py-2.5 text-sm text-white shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 h-11"
          >
            <option value="ongoing">Ongoing</option>
            <option value="hiatus">Hiatus</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">Cover URL</label>
          <Input 
            placeholder="https://..." 
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="bg-[#0e0f11] border-border/50 text-white h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">Last read chapter</label>
          <Input 
            type="number"
            min={0}
            value={lastChapter}
            onChange={(e) => setLastChapter(e.target.value)}
            className="bg-[#0e0f11] border-border/50 text-white h-11"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">Latest chapter</label>
          <Input 
            type="number"
            min={0}
            value={latestChapter}
            onChange={(e) => setLatestChapter(e.target.value)}
            className="bg-[#0e0f11] border-border/50 text-white h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Description</label>
        <textarea
          className="flex min-h-[120px] w-full rounded-md border border-border/50 bg-[#0e0f11] px-3 py-3 text-sm text-white shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Short synopsis..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="pt-6 pb-2 flex justify-end gap-4 items-center">
        <Button variant="ghost" type="button" asChild className="text-muted-foreground hover:text-white hover:bg-white/5 font-medium">
          <Link to="/library">Cancel</Link>
        </Button>
        <Button type="submit" disabled={addMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold px-8 h-10 shadow-md">
          Add to library
        </Button>
      </div>
    </form>
  );
}

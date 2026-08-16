import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Globe, Send } from 'lucide-react';

export function AddManhwaForm() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [status, setStatus] = useState<'ongoing' | 'completed' | 'hiatus' | 'dropped'>('ongoing');
  const [lastChapter, setLastChapter] = useState('');
  const [latestChapter, setLatestChapter] = useState('');
  const [description, setDescription] = useState('');

  // Optional source
  const [sourceUrl, setSourceUrl]   = useState('');
  const [sourceType, setSourceType] = useState<'website' | 'telegram'>('website');

  const addSourceMutation = trpc.manhwa.addSource.useMutation({
    onError: (err) => {
      // Non-fatal — manhwa was already created; just warn about the source
      toast.warning('Manhwa added, but source could not be attached', { description: err.message });
    },
  });

  const addMutation = trpc.manhwa.create.useMutation({
    onSuccess: async (result) => {
      // Attach source if one was provided
      if (sourceUrl.trim()) {
        await addSourceMutation.mutateAsync({
          manhwaId: result.id,
          url: sourceUrl.trim(),
          type: sourceType,
        });
      }
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

  const isPending = addMutation.isPending || addSourceMutation.isPending;

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
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">Tags (comma separated)</label>
        <Input
          placeholder="Fantasy, Action"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="bg-[#0e0f11] border-border/50 text-white h-11"
        />
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

      {/* ── Optional source ─────────────────────────────────────────── */}
      <div className="border border-border/30 rounded-xl p-4 space-y-3 bg-[#0e0f11]">
        <p className="text-sm font-medium text-white flex items-center gap-2">
          <span className="text-zinc-500">Add a source</span>
          <span className="text-[10px] text-zinc-600 font-normal border border-border/40 rounded px-1.5 py-0.5">optional</span>
        </p>
        <div className="flex gap-2">
          {/* Type toggle */}
          <div className="flex rounded-md overflow-hidden border border-border/40 shrink-0">
            <button
              type="button"
              onClick={() => setSourceType('website')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                sourceType === 'website'
                  ? 'bg-amber-500 text-amber-950'
                  : 'bg-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Globe className="h-3 w-3" />
              Website
            </button>
            <button
              type="button"
              onClick={() => setSourceType('telegram')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                sourceType === 'telegram'
                  ? 'bg-amber-500 text-amber-950'
                  : 'bg-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Send className="h-3 w-3" />
              Telegram
            </button>
          </div>
          {/* URL input */}
          <Input
            placeholder={sourceType === 'telegram' ? '@channel_name or t.me/...' : 'https://asuracomic.net/series/...'}
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="bg-[#161719] border-border/40 text-white h-9 text-sm flex-1"
          />
        </div>
      </div>

      <div className="pt-6 pb-2 flex justify-end gap-4 items-center">
        <Button variant="ghost" type="button" asChild className="text-muted-foreground hover:text-white hover:bg-white/5 font-medium">
          <Link to="/library">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isPending} className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold px-8 h-10 shadow-md">
          Add to library
        </Button>
      </div>
    </form>
  );
}
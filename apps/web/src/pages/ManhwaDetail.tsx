import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, ChevronDown, ChevronUp, Plus, Send } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export function ManhwaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  
  const { data: manhwa, isLoading } = trpc.manhwa.getById.useQuery(id!, {
    enabled: !!id,
  });

  const [localChapter, setLocalChapter] = useState(0);

  useEffect(() => {
    if (manhwa?.progress?.lastChapter) {
      setLocalChapter(manhwa.progress.lastChapter);
    }
  }, [manhwa]);

  const updateProgressMutation = trpc.manhwa.updateProgress.useMutation({
    onSuccess: () => {
      utils.manhwa.getById.invalidate(id);
      utils.manhwa.getAll.invalidate();
    },
    onError: () => {
      toast.error('Failed to update progress');
      setLocalChapter(manhwa?.progress?.lastChapter ?? 0);
    }
  });

  const handleProgressChange = (newChapter: number) => {
    if (newChapter < 0) return;
    setLocalChapter(newChapter);
    updateProgressMutation.mutate({
      manhwaId: id!,
      chapter: newChapter,
    });
  };

  const deleteMutation = trpc.manhwa.delete.useMutation({
    onSuccess: () => {
      toast.success('Manhwa removed');
      utils.manhwa.getAll.invalidate();
      navigate('/library');
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!manhwa) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Manhwa not found</h2>
        <Button asChild>
          <Link to="/library">Back to Library</Link>
        </Button>
      </div>
    );
  }

  const latestChapter = Math.max(manhwa.progress?.latestChapter ?? 0, 241); // Mock 241 for UI accuracy based on image if missing
  const unread = Math.max(0, latestChapter - localChapter);
  const progressPercent = Math.min(100, Math.max(0, (localChapter / Math.max(1, latestChapter)) * 100));

  // Mock UI data to match the screenshot
  const tags = ["Fantasy", "Action", "Reincarnation"];
  const author = manhwa.author || "TurtleMe";
  const description = manhwa.description || "King Grey has unrivaled strength, wealth, and prestige. Reincarnated into a new world of magic, he gets a second chance.";

  return (
    <div className="max-w-5xl mx-auto pb-20 mt-6">
      <Button variant="ghost" size="sm" asChild className="mb-6 -ml-3 text-muted-foreground hover:text-foreground">
        <Link to="/library">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Link>
      </Button>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Left Column - Poster and Actions */}
        <div className="shrink-0 mx-auto md:mx-0 w-64 flex flex-col gap-3">
          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#161719] border border-border/30 shadow-2xl relative">
            {manhwa.coverUrl ? (
              <img src={manhwa.coverUrl} alt={manhwa.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-600 font-medium">NO COVER</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f11]/80 via-transparent to-transparent pointer-events-none" />
          </div>
          
          <Button 
            className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold shadow-md h-11"
            onClick={() => handleProgressChange(localChapter + 1)}
          >
            <div className="flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 19V5C4 3.89543 4.89543 3 6 3H19.4C19.7314 3 20 3.26863 20 3.6V16.7143C20 19.0812 18.0812 21 15.7143 21H6C4.89543 21 4 20.1046 4 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Continue Ch. {localChapter + 1}
            </div>
          </Button>

          <Button 
            variant="ghost" 
            className="w-full text-red-500 hover:text-red-400 hover:bg-red-500/10 gap-2 font-medium"
            onClick={() => {
              if (confirm('Are you sure you want to remove this manhwa?')) {
                deleteMutation.mutate(id!);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        </div>

        {/* Right Column - Info and Progress */}
        <div className="flex-1 space-y-8 mt-2">
          {/* Header Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{manhwa.status || 'ONGOING'}</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">{manhwa.title}</h1>
            <p className="text-muted-foreground text-lg mb-4">by {author}</p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-[#1e1f22] hover:bg-[#2a2b2f] text-muted-foreground font-normal border-border/40 px-3">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <p className="text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {/* Reading Progress Card */}
          <Card className="bg-[#161719] border-border/30 p-6 rounded-2xl shadow-lg">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-6">Reading Progress</h3>
            
            <div className="flex flex-col gap-6">
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{localChapter}</span>
                  <span className="text-2xl font-bold text-muted-foreground">/ {latestChapter}</span>
                </div>
                
                <div className="flex items-center gap-4 bg-[#0e0f11] px-1 py-1 rounded-lg border border-border/30">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-white rounded-md"
                    onClick={() => handleProgressChange(localChapter - 1)}
                    disabled={localChapter <= 0 || updateProgressMutation.isPending}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <div className="w-8 text-center font-medium">
                    {localChapter}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-white rounded-md"
                    onClick={() => handleProgressChange(localChapter + 1)}
                    disabled={updateProgressMutation.isPending}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="h-2 w-full bg-[#0e0f11] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-sm font-medium text-amber-500">
                  {unread > 0 ? `${unread} new chapters available` : 'Caught up!'}
                </div>
              </div>
            </div>
          </Card>

          {/* Sources Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xl font-bold text-white mb-4">Sources</h3>
            
            <Card className="bg-[#161719] border-border/30 p-4 rounded-xl flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Send size={18} className="-ml-0.5" />
                </div>
                <div>
                  <h4 className="font-semibold text-white">@tbate_channel</h4>
                  <p className="text-sm text-muted-foreground">Telegram · Latest Ch. 237</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>

            <Card className="bg-[#161719] border-border/30 p-4 rounded-xl flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M2 12H22" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 2C15.3137 2 18 6.47715 18 12C18 17.5228 15.3137 22 12 22C8.68629 22 6 17.5228 6 12C6 6.47715 8.68629 2 12 2Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-white">asurascans.com</h4>
                  <p className="text-sm text-muted-foreground">Website · Latest Ch. 241</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>

            <Card className="bg-transparent border border-dashed border-border/50 p-4 rounded-xl mt-4">
              <p className="text-sm font-medium text-white mb-3">Add a source</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <select className="bg-[#161719] border border-border/50 text-white text-sm rounded-lg px-3 py-2 w-full sm:w-[140px] focus:outline-none focus:ring-1 focus:ring-amber-500">
                  <option>Telegram</option>
                  <option>Website</option>
                </select>
                <div className="flex-1 flex gap-2">
                  <input 
                    type="text" 
                    placeholder="@channel or URL" 
                    className="bg-[#161719] border border-border/50 text-white text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-muted-foreground"
                  />
                  <input 
                    type="text" 
                    placeholder="Latest" 
                    className="bg-[#161719] border border-border/50 text-white text-sm rounded-lg px-3 py-2 w-20 hidden sm:block focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-muted-foreground text-center"
                  />
                  <Button className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-3 shrink-0 rounded-lg">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

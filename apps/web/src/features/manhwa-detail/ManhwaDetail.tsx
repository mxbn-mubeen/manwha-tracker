import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { ManhwaPoster } from '@/features/manhwa-detail/components/ManhwaPoster';
import { ManhwaHeader } from '@/features/manhwa-detail/components/ManhwaHeader';
import { ProgressCard } from '@/features/manhwa-detail/components/ProgressCard';
import { SourcesList } from '@/features/manhwa-detail/components/SourcesList';
import { EditManhwaModal } from '@/features/manhwa-detail/components/EditManhwaModal';

export function ManhwaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  
  const numericId = Number(id!);
  const { data: manhwa, isLoading } = trpc.manhwa.getById.useQuery(numericId, {
    enabled: !!id && !isNaN(numericId),
  });

  const [localChapter, setLocalChapter] = useState(0);

  useEffect(() => {
    if (manhwa?.progress?.lastChapter) {
      setLocalChapter(manhwa.progress.lastChapter);
    }
  }, [manhwa]);

  const updateProgressMutation = trpc.manhwa.updateProgress.useMutation({
    onSuccess: () => {
      utils.manhwa.getById.invalidate(numericId);
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
      manhwaId: numericId,
      chapter: newChapter,
    });
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const latestChapter = manhwa.progress?.latestChapter ?? 0;

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
        <ManhwaPoster 
          coverUrl={manhwa.coverUrl || null} 
          title={manhwa.title} 
          localChapter={localChapter} 
          onContinueReading={() => handleProgressChange(localChapter + 1)} 
          onEdit={() => setIsEditModalOpen(true)} 
        />

        {/* Right Column - Info and Progress */}
        <div className="flex-1 space-y-8 mt-2">
          {/* Header Info */}
          <ManhwaHeader 
            id={numericId} 
            title={manhwa.title} 
            status={manhwa.status || null} 
            genres={manhwa.genres || null} 
            description={manhwa.description || null} 
          />

          {/* Reading Progress Card */}
          <ProgressCard 
            localChapter={localChapter} 
            latestChapter={latestChapter} 
            onProgressChange={handleProgressChange} 
            isPending={updateProgressMutation.isPending} 
          />

          {/* Sources Section */}
          <SourcesList 
            manhwaId={numericId} 
            sources={manhwa.sources} 
            latestChapter={latestChapter} 
          />
        </div>
      </div>

      {isEditModalOpen && (
        <EditManhwaModal 
          manhwaId={numericId} 
          initialTitle={manhwa.title} 
          initialDescription={manhwa.description || null} 
          initialCoverUrl={manhwa.coverUrl || null} 
          initialGenres={manhwa.genres || null}
          onClose={() => setIsEditModalOpen(false)} 
        />
      )}
    </div>
  );
}

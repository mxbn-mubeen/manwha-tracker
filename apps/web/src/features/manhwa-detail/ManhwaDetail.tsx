import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookmarkPlus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { ManhwaPoster } from '@/features/manhwa-detail/components/ManhwaPoster';
import { ManhwaHeader } from '@/features/manhwa-detail/components/ManhwaHeader';
import { ProgressCard } from '@/features/manhwa-detail/components/ProgressCard';
import { SourcesList } from '@/features/manhwa-detail/components/SourcesList';
import { EditManhwaModal } from '@/features/manhwa-detail/components/EditManhwaModal';
import { UnreadManhwaStrip } from '@/features/manhwa-detail/components/UnreadManhwaStrip';
import { usePageTitle } from '@/lib/usePageTitle';
import { useSession } from '@/lib/auth-client';
import { AuthModal } from '@/features/auth/AuthModal';
import { useManhwaTracking } from './hooks/useManhwaTracking';

export function ManhwaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = useSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const user = session?.user;
  const isAdmin = (user as any)?.role === 'admin';

  const numericId = Number(id!);
  const { data: manhwa, isLoading: isManhwaLoading } = trpc.manhwa.getById.useQuery(numericId, {
    enabled: !!id && !isNaN(numericId) && !isSessionPending,
  });
  const isLoading = isSessionPending || isManhwaLoading;

  usePageTitle(manhwa?.title);

  const [localChapter, setLocalChapter] = useState(0);

  useEffect(() => {
    if (manhwa) {
      setLocalChapter(manhwa.progress?.lastChapter ?? 0);
    }
  }, [manhwa]);

  const {
    startTrackingMutation,
    stopTrackingMutation,
    updateStatusMutation,
    updateProgressMutation,
  } = useManhwaTracking(numericId, manhwa, setLocalChapter);

  const handleProgressChange = (newChapter: number) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (newChapter < 0) return;
    const cap = manhwa?.progress?.latestChapter ?? Infinity;
    const clamped = Math.min(newChapter, cap);
    setLocalChapter(clamped);
    updateProgressMutation.mutate({
      manhwaId: numericId,
      chapter: clamped,
    });
  };

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

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back</span>
        </button>
      </div>

      <UnreadManhwaStrip currentId={numericId} />

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <ManhwaPoster
            title={manhwa.title}
            coverUrl={manhwa.coverUrl}
            isTracking={manhwa.progress?.isTracking ?? false}
            onStartTracking={() => {
              if (!user) {
                setAuthModalOpen(true);
                return;
              }
              startTrackingMutation.mutate(numericId);
            }}
            onStopTracking={() => stopTrackingMutation.mutate(numericId)}
            isStarting={startTrackingMutation.isPending}
            isStopping={stopTrackingMutation.isPending}
          />
        </div>

        <div className="md:col-span-2 space-y-6">
          <ManhwaHeader manhwa={manhwa} onEdit={() => setIsEditModalOpen(true)} />

          {/* Tracking Callout for Guests or Untracked users */}
          {(!user || !manhwa.progress?.isTracking) && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {user ? 'Track your reading progress' : 'Sign in to track progress'}
                </p>
                <p className="text-xs text-zinc-400">
                  {user
                    ? 'Add this title to your library to log chapters and track updates.'
                    : 'Create a free account to track your chapters, get unread badges, and sync across devices.'}
                </p>
              </div>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold gap-1.5 shrink-0"
                onClick={() => {
                  if (!user) {
                    setAuthModalOpen(true);
                  } else {
                    startTrackingMutation.mutate(numericId);
                  }
                }}
                disabled={startTrackingMutation.isPending}
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{user ? 'Start Tracking' : 'Sign In to Track'}</span>
              </Button>
            </div>
          )}

          {/* Only render active reading progress controls if the user is tracking it */}
          {user && manhwa.progress?.isTracking && (
            <ProgressCard
              manhwa={manhwa}
              localChapter={localChapter}
              onProgressChange={handleProgressChange}
              onStatusChange={(status) => updateStatusMutation.mutate({ manhwaId: numericId, status })}
              isUpdatingStatus={updateStatusMutation.isPending}
            />
          )}

          <SourcesList manhwa={manhwa} />
        </div>
      </div>

      {isAdmin && (
        <EditManhwaModal
          manhwa={manhwa}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode="signin"
      />
    </div>
  );
}
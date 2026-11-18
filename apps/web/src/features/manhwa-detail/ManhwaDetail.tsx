import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookmarkPlus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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

export function ManhwaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: session, isPending: isSessionPending } = useSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);

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

  const startTrackingMutation = trpc.manhwa.startTracking.useMutation({
    onMutate: async () => {
      await utils.manhwa.getById.cancel(numericId);
      const previous = utils.manhwa.getById.getData(numericId);
      utils.manhwa.getById.setData(numericId, (old: typeof manhwa) =>
        old
          ? {
              ...old,
              progress: {
                ...old.progress,
                id: old.progress?.id || 1,
                isTracking: true,
                status: 'reading',
                lastChapter: old.progress?.lastChapter ?? 0,
                latestChapter: old.progress?.latestChapter ?? 0,
                isCompleted: false,
                lastReadAt: new Date(),
              },
            }
          : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      toast.error('Failed to start tracking');
      if (ctx?.previous) utils.manhwa.getById.setData(numericId, ctx.previous);
    },
    onSuccess: () => {
      toast.success(`Added to your reading list!`);
      utils.manhwa.getById.invalidate(numericId, { refetchType: 'none' });
      utils.manhwa.getAll.invalidate(undefined, { refetchType: 'none' });
    },
  });

  const stopTrackingMutation = trpc.manhwa.stopTracking.useMutation({
    onMutate: async () => {
      await utils.manhwa.getById.cancel(numericId);
      const previous = utils.manhwa.getById.getData(numericId);
      utils.manhwa.getById.setData(numericId, (old: typeof manhwa) =>
        old
          ? {
              ...old,
              progress: {
                ...old.progress,
                isTracking: false,
                status: null,
              },
            }
          : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      toast.error('Failed to remove from reading list');
      if (ctx?.previous) utils.manhwa.getById.setData(numericId, ctx.previous);
    },
    onSuccess: () => {
      toast.success(`Removed from your reading list`);
      utils.manhwa.getById.invalidate(numericId, { refetchType: 'none' });
      utils.manhwa.getAll.invalidate(undefined, { refetchType: 'none' });
    },
  });

  const updateStatusMutation = trpc.manhwa.updateTrackingStatus.useMutation({
    onMutate: async ({ status }) => {
      await utils.manhwa.getById.cancel(numericId);
      const previous = utils.manhwa.getById.getData(numericId);
      utils.manhwa.getById.setData(numericId, (old: typeof manhwa) =>
        old
          ? {
              ...old,
              progress: {
                ...old.progress,
                status,
                isTracking: true,
                isCompleted: status === 'completed',
              },
            }
          : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      toast.error('Failed to update status');
      if (ctx?.previous) utils.manhwa.getById.setData(numericId, ctx.previous);
    },
    onSuccess: () => {
      toast.success(`Reading status updated`);
      utils.manhwa.getById.invalidate(numericId, { refetchType: 'none' });
      utils.manhwa.getAll.invalidate(undefined, { refetchType: 'none' });
    },
  });

  const updateProgressMutation = trpc.manhwa.updateProgress.useMutation({
    // Update the cached page data immediately so the UI never waits on the
    // network (Vercel cold start + Neon round trips can take a few seconds).
    onMutate: async ({ chapter }) => {
      // Stop any in-flight refetch from overwriting the optimistic value
      await utils.manhwa.getById.cancel(numericId);
      const previous = utils.manhwa.getById.getData(numericId);
      utils.manhwa.getById.setData(numericId, (old: typeof manhwa) =>
        old
          ? {
              ...old,
              progress: {
                ...old.progress,
                lastChapter: chapter,
                latestChapter: old.progress?.latestChapter ?? 0,
                lastReadAt: new Date(),
              },
            }
          : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      toast.error('Failed to update progress');
      if (ctx?.previous) utils.manhwa.getById.setData(numericId, ctx.previous);
      setLocalChapter(ctx?.previous?.progress?.lastChapter ?? 0);
    },
    onSuccess: () => {
      // Library/dashboard lists refresh the next time they are opened, instead
      // of re-running the heavy getAll + getById queries right after every click.
      utils.manhwa.getAll.invalidate(undefined, { refetchType: 'none' });
    },
  });

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
  const readingUrl =
    manhwa.sources?.find((s: { type?: string | null; url?: string | null }) => s.type === 'website' && s.url)?.url ??
    manhwa.sources?.find((s: { url?: string | null }) => s.url)?.url ??
    null;

  return (
    <div className="max-w-5xl mx-auto pb-20 mt-4">
      <Link
        to="/library"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111214] border border-border/20 hover:border-amber-500/30 text-xs font-semibold text-zinc-400 hover:text-white transition-all btn-press mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5 text-zinc-400" />
        <span>Back to Library</span>
      </Link>

      <div className="flex flex-col md:flex-row gap-10">
        {/* Left Column - Poster and Actions */}
        <ManhwaPoster
          coverUrl={manhwa.coverUrl || null}
          title={manhwa.title}
          localChapter={localChapter}
          latestChapter={latestChapter}
          readingUrl={readingUrl}
          onContinueReading={() => handleProgressChange(localChapter + 1)}
          onMarkCaughtUp={() => handleProgressChange(latestChapter)}
          onEdit={() => setIsEditModalOpen(true)}
          canEdit={isAdmin}
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
            latestChapter={latestChapter}
            cadenceInfo={manhwa.cadenceInfo}
            isAdmin={isAdmin}
          />

          {/* Reading Progress Card — only for signed-in users */}
          {user ? (
            manhwa.progress?.isTracking ? (
              <ProgressCard
                localChapter={localChapter}
                latestChapter={latestChapter}
                status={manhwa.status}
                userStatus={manhwa.progress?.status || 'reading'}
                onProgressChange={handleProgressChange}
                onStatusChange={(newStatus) =>
                  updateStatusMutation.mutate({ manhwaId: numericId, status: newStatus })
                }
                onStopTracking={() => stopTrackingMutation.mutate({ manhwaId: numericId })}
                isPending={updateProgressMutation.isPending}
              />
            ) : (
              <div className="bg-[#111214] border border-border/20 p-5 sm:p-6 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                    Reading Progress
                  </span>
                  <span className="text-xs font-mono text-zinc-500 font-semibold">
                    Not in Reading List
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Add this manhwa to your personal list to record your chapters, track unread releases, and customize your reading status.
                </p>
                <Button
                  onClick={() => startTrackingMutation.mutate({ manhwaId: numericId })}
                  disabled={startTrackingMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl h-9 px-4 gap-2 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Start Tracking</span>
                </Button>
              </div>
            )
          ) : (
            <div className="bg-[#111214] border border-border/20 p-5 sm:p-6 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                  Reading Progress
                </span>
                <span className="text-xs font-mono text-amber-400 font-semibold">
                  Sign In Required
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-400">
                Sign in to track what chapter you are on, receive release updates, and sync your reading progress across your devices.
              </p>
              <Button
                onClick={() => setAuthModalOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl h-9 px-4 cursor-pointer"
              >
                Sign In to Track
              </Button>
            </div>
          )}

          {/* Sources Section */}
          <SourcesList
            manhwaId={numericId}
            sources={manhwa.sources}
            latestChapter={latestChapter}
            canManage={isAdmin}
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

      {/* Up Next — other unread manhwa — only for logged-in user */}
      {user && <UnreadManhwaStrip currentManhwaId={numericId} />}

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
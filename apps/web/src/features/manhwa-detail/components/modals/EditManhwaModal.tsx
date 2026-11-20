import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getProxiedImageUrl } from '@/utils/image';
import { ManageChaptersSection } from './ManageChaptersSection';

interface EditManhwaModalProps {
  manhwaId: number;
  initialTitle: string;
  initialDescription: string | null;
  initialCoverUrl: string | null;
  initialGenres?: string[] | null;
  onClose: () => void;
}

export function EditManhwaModal({
  manhwaId,
  initialTitle,
  initialDescription,
  initialCoverUrl,
  initialGenres,
  onClose,
}: EditManhwaModalProps) {
  const utils = trpc.useUtils();
  const navigate = useNavigate();

  const [editTitle, setEditTitle] = useState(initialTitle);
  const [editDescription, setEditDescription] = useState(initialDescription || '');
  const [editCoverUrl, setEditCoverUrl] = useState(initialCoverUrl || '');
  const [editGenres, setEditGenres] = useState(initialGenres?.join(', ') || '');
  const [chaptersExpanded, setChaptersExpanded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  const updateMutation = trpc.manhwa.update.useMutation({
    onSuccess: () => {
      toast.success('Manhwa updated');
      utils.manhwa.getById.invalidate(manhwaId);
      utils.manhwa.getAll.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message || 'Failed to update manhwa'),
  });

  const deleteMutation = trpc.manhwa.delete.useMutation({
    onSuccess: () => {
      toast.success('Manhwa moved to Recently Deleted', {
        description: 'You have 30 days to recover it from Settings → Recently Deleted.',
      });
      utils.manhwa.getAll.invalidate();
      navigate('/dashboard');
    },
    onError: (err) => toast.error(err.message || 'Failed to delete manhwa'),
  });

  const handleUpdate = () => {
    if (updateMutation.isPending) return;
    const parsedTags = editGenres.split(',').map((t) => t.trim()).filter(Boolean);
    updateMutation.mutate({
      id: manhwaId,
      title: editTitle,
      description: editDescription,
      coverUrl: editCoverUrl,
      genres: parsedTags,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 5) {
        toast.error('File is too large. Max 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setEditCoverUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
    >
      {/* Full-screen Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-modal-backdrop"
        onClick={onClose}
      />

      {/* Centered Modal Card */}
      <div
        className="relative w-full max-w-lg bg-[#111214] border border-border/30 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-modal-content z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between bg-[#161719]/80 shrink-0">
          <h2 id="edit-modal-title" className="text-lg font-bold text-white tracking-tight">
            Edit Manhwa
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          <div>
            <label htmlFor="edit-title" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5 block">
              Title
            </label>
            <input
              id="edit-title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="bg-black/40 border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label htmlFor="edit-genres" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5 block">
              Genres <span className="text-zinc-500 normal-case tracking-normal font-normal">(comma separated)</span>
            </label>
            <input
              id="edit-genres"
              type="text"
              value={editGenres}
              onChange={(e) => setEditGenres(e.target.value)}
              className="bg-black/40 border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-zinc-600"
              placeholder="Action, Fantasy, Reincarnation"
            />
          </div>

          <div>
            <label htmlFor="edit-description" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5 block">
              Description
            </label>
            <textarea
              id="edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="bg-black/40 border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none placeholder:text-zinc-600 custom-scrollbar"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1.5 block">
              Cover Image
            </label>
            {editCoverUrl && (
              <div className="mb-3 flex items-center justify-between gap-4 bg-black/40 p-3 rounded-xl border border-white/10 group">
                <div className="flex items-center gap-3">
                  <img src={getProxiedImageUrl(editCoverUrl)} alt="Cover preview" className="w-12 h-16 object-cover rounded-md shadow-md ring-1 ring-white/10 shrink-0" />
                  <span className="text-xs text-zinc-400 truncate max-w-[180px]">Current cover</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 opacity-80 group-hover:opacity-100 hover:text-red-300 hover:bg-red-500/10 h-8"
                  onClick={() => setEditCoverUrl('')}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            <input
              type="text"
              value={editCoverUrl}
              onChange={(e) => setEditCoverUrl(e.target.value)}
              placeholder="Paste image URL..."
              className="bg-black/40 border border-white/10 text-white text-sm rounded-xl px-3.5 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all placeholder:text-zinc-600"
            />
            <div className="mt-2.5">
              <input
                id="edit-cover-file"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                title="Upload cover image"
                aria-label="Upload cover image"
                className="text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/15 w-full transition-all cursor-pointer"
              />
            </div>
          </div>

          <div className="border-t border-white/10 pt-3">
            <ManageChaptersSection
              manhwaId={manhwaId}
              expanded={chaptersExpanded}
              onToggle={() => setChaptersExpanded((v) => !v)}
            />
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-5 py-3.5 border-t border-border/20 flex justify-between items-center bg-[#161719]/80 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 h-9 rounded-xl text-xs"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("Move this manhwa to Recently Deleted?\n\nYou'll have 30 days to recover it.")) {
                deleteMutation.mutate(manhwaId);
              }
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-4 text-xs text-zinc-400 hover:text-white rounded-xl"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-9 px-5 text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all btn-press"
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !editTitle.trim()}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

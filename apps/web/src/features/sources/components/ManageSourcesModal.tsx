import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ManhwaCoverImage } from './ManhwaCoverImage';
import { SourceDetailRow } from './SourceDetailRow';
import { AddSourceForm } from '@/features/manhwa-detail/components/AddSourceForm';
import type { ManhwaGroup } from './ManhwaSourcesView';

interface ManageSourcesModalProps {
  group: ManhwaGroup;
  onClose: () => void;
}

export function ManageSourcesModal({ group, onClose }: ManageSourcesModalProps) {
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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Full-screen Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-modal-backdrop"
        onClick={onClose}
      />

      {/* Centered Modal Card */}
      <div
        className="relative w-full max-w-2xl bg-[#111214] border border-border/30 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-modal-content z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="p-4 sm:p-5 border-b border-border/20 flex items-center justify-between gap-4 bg-[#161719]/80 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-14 rounded overflow-hidden bg-zinc-900 border border-border/30 shrink-0">
              <ManhwaCoverImage src={group.manhwaCover} alt={group.manhwaTitle} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white truncate" title={group.manhwaTitle}>
                  {group.manhwaTitle}
                </h2>
                <Link
                  to={`/manhwa/${group.manhwaId}`}
                  className="text-xs text-zinc-400 hover:text-amber-400 shrink-0"
                  title="View Manhwa Details"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {group.sources.length} {group.sources.length === 1 ? 'source' : 'sources'} linked
              </p>
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
              Active Sources
            </h3>
            <div className="space-y-2.5">
              {group.sources.map((s) => (
                <SourceDetailRow key={s.id} source={s} />
              ))}
            </div>
          </div>

          {/* Add a source inside the modal */}
          <div className="pt-2">
            <AddSourceForm manhwaId={group.manhwaId} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getProxiedImageUrl } from "@/utils/image";
import { ManageChaptersSection } from "./ManageChaptersSection";

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
  const [editDescription, setEditDescription] = useState(initialDescription || "");
  const [editCoverUrl, setEditCoverUrl] = useState(initialCoverUrl || "");
  const [editGenres, setEditGenres] = useState(initialGenres?.join(", ") || "");
  const [chaptersExpanded, setChaptersExpanded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const updateMutation = trpc.manhwa.update.useMutation({
    onSuccess: () => {
      toast.success("Manhwa updated");
      utils.manhwa.getById.invalidate(manhwaId);
      utils.manhwa.getAll.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to update manhwa"),
  });

  const deleteMutation = trpc.manhwa.delete.useMutation({
    onSuccess: () => {
      toast.success("Manhwa moved to Recently Deleted", {
        description: "You have 30 days to recover it from Settings → Recently Deleted.",
      });
      utils.manhwa.getAll.invalidate();
      navigate("/dashboard");
    },
    onError: (err) => toast.error(err.message || "Failed to delete manhwa"),
  });

  const handleUpdate = () => {
    if (updateMutation.isPending) return;
    const parsedTags = editGenres.split(",").map((t) => t.trim()).filter(Boolean);
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
        toast.error("File is too large. Max 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setEditCoverUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      onPointerDown={onClose}
    >
      <Card
        className="bg-[#111214]/90 backdrop-blur-2xl border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2 id="edit-modal-title" className="text-xl font-bold text-white mb-6 tracking-tight">
          Edit Manhwa
        </h2>

        <div className="space-y-5">
          <div>
            <label htmlFor="edit-title" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5 block">Title</label>
            <input
              id="edit-title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="bg-black/40 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label htmlFor="edit-genres" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5 block">Genres <span className="text-zinc-600 normal-case tracking-normal font-normal">(comma separated)</span></label>
            <input
              id="edit-genres"
              type="text"
              value={editGenres}
              onChange={(e) => setEditGenres(e.target.value)}
              className="bg-black/40 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-zinc-600"
              placeholder="Action, Fantasy"
            />
          </div>

          <div>
            <label htmlFor="edit-description" className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5 block">Description</label>
            <textarea
              id="edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="bg-black/40 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none placeholder:text-zinc-600 custom-scrollbar"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 mb-1.5 block">Cover Image</label>
            {editCoverUrl && (
              <div className="mb-3 flex items-center justify-between gap-4 bg-black/40 p-3 rounded-xl border border-white/10 group">
                <div className="flex items-center gap-4">
                  <img src={getProxiedImageUrl(editCoverUrl)} alt="Cover preview" className="w-12 h-16 object-cover rounded-md shadow-md ring-1 ring-white/10" />
                  <span className="text-xs text-zinc-400 truncate max-w-[150px]">Current cover</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 opacity-80 group-hover:opacity-100 hover:text-red-300 hover:bg-red-500/10 h-8"
                  onClick={() => setEditCoverUrl("")}
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
              className="bg-black/40 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 w-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-zinc-600"
            />
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/5"></div>
              <span className="text-[10px] uppercase font-semibold text-zinc-600 tracking-wider">Or</span>
              <div className="flex-1 h-px bg-white/5"></div>
            </div>
            <div className="mt-3">
              <input
                id="edit-cover-file"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                title="Upload cover image"
                aria-label="Upload cover image"
                className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/5 file:text-white hover:file:bg-white/10 w-full overflow-hidden transition-all cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <ManageChaptersSection
            manhwaId={manhwaId}
            expanded={chaptersExpanded}
            onToggle={() => setChaptersExpanded((v) => !v)}
          />
        </div>

        <div className="mt-8 flex justify-between items-center pt-2">
          <Button
            variant="ghost"
            className="text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 h-10 rounded-xl"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("Move this manhwa to Recently Deleted?\n\nYou'll have 30 days to recover it.")) {
                deleteMutation.mutate(manhwaId);
              }
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" className="h-10 px-5 text-zinc-400 hover:text-white rounded-xl" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-10 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !editTitle.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

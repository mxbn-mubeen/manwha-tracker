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
    const parsedTags = editGenres.split(",").map((t) => t.trim()).filter(Boolean);
    updateMutation.mutate({
      id: manhwaId,
      title: editTitle,
      description: editDescription,
      coverUrl: editCoverUrl,
      genres: parsedTags.length > 0 ? parsedTags : undefined,
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
      onClick={onClose}
    >
      <Card
        className="bg-[#161719] border-border/30 p-6 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-modal-title" className="text-xl font-bold text-white mb-4">
          Edit Manhwa
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="edit-title" className="text-sm font-medium text-zinc-400">Title</label>
            <input
              id="edit-title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="mt-1 bg-[#0e0f11] border border-border/50 text-white text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label htmlFor="edit-genres" className="text-sm font-medium text-zinc-400">Genres (comma separated)</label>
            <input
              id="edit-genres"
              type="text"
              value={editGenres}
              onChange={(e) => setEditGenres(e.target.value)}
              className="mt-1 bg-[#0e0f11] border border-border/50 text-white text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="Action, Fantasy"
            />
          </div>

          <div>
            <label htmlFor="edit-description" className="text-sm font-medium text-zinc-400">Description</label>
            <textarea
              id="edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={4}
              className="mt-1 bg-[#0e0f11] border border-border/50 text-white text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-400">Cover URL or Image Upload</label>
            {editCoverUrl && (
              <div className="mt-1 mb-2 flex items-center gap-4 bg-[#0e0f11] p-3 rounded-lg border border-border/50">
                <img src={getProxiedImageUrl(editCoverUrl)} alt="Cover preview" className="w-16 h-16 object-cover rounded shadow-md" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => setEditCoverUrl("")}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            )}
            <input
              type="text"
              value={editCoverUrl}
              onChange={(e) => setEditCoverUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 bg-[#0e0f11] border border-border/50 text-white text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-zinc-500">Or upload:</span>
              <input
                id="edit-cover-file"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                title="Upload cover image"
                aria-label="Upload cover image"
                className="text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-amber-500 hover:file:bg-zinc-700 w-full overflow-hidden"
              />
            </div>
          </div>
        </div>

        <ManageChaptersSection
          manhwaId={manhwaId}
          expanded={chaptersExpanded}
          onToggle={() => setChaptersExpanded((v) => !v)}
        />

        <div className="mt-8 flex justify-between items-center">
          <Button
            variant="ghost"
            className="text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 h-9"
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
            <Button variant="ghost" className="h-9 px-4 text-zinc-300 hover:text-white" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold h-9 px-4"
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !editTitle.trim()}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

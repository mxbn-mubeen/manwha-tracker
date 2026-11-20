import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { SourceInputSection } from '@/features/sources/components/SourceInputSection';

interface AddSourceFormProps {
  manhwaId: number;
}

export function AddSourceForm({ manhwaId }: AddSourceFormProps) {
  const utils = trpc.useUtils();
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceType, setNewSourceType] = useState<'telegram' | 'website'>('telegram');

  const addSourceMutation = trpc.manhwa.addSource.useMutation({
    onSuccess: () => {
      toast.success('Source added!');
      setNewSourceUrl('');
      utils.manhwa.getById.invalidate(manhwaId);
      utils.manhwa.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message || 'Failed to add source'),
  });

  const handleAddSource = () => {
    const trimmed = newSourceUrl.trim();
    if (!trimmed) return;
    addSourceMutation.mutate({ manhwaId, url: trimmed, type: newSourceType });
  };

  return (
    <SourceInputSection
      url={newSourceUrl}
      type={newSourceType}
      onUrlChange={setNewSourceUrl}
      onTypeChange={setNewSourceType}
      onSubmit={handleAddSource}
      isSubmitting={addSourceMutation.isPending}
      variant="dashed"
    />
  );
}

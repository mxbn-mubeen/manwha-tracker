import { Button } from '@/components/ui/button';
import { Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

export function FixAdapterKeysButton() {
  const utils = trpc.useUtils();
  const mutation = trpc.manhwa.redetectAdapterKeys.useMutation({
    onSuccess: (data) => {
      toast.success(`✅ Fixed adapter keys for ${data.fixed} sources`);
      utils.manhwa.getAllSources.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/15 hover:text-amber-300 shrink-0 bg-[#161719] rounded-xl h-9 px-3.5 text-xs font-semibold transition-all btn-press shadow-sm"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      title="Fix adapter keys for all website sources"
    >
      {mutation.isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Wand2 className="h-3.5 w-3.5 text-amber-400" />
      )}
      <span>Re-detect Adapters</span>
    </Button>
  );
}

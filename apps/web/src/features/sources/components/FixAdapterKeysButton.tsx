import { Button } from "@/components/ui/button";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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
    <div className="flex flex-col items-end">
      <Button size="sm" variant="outline"
        className="gap-2 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 shrink-0 bg-transparent rounded-lg h-9 px-4 transition-colors"
        onClick={() => mutation.mutate()} disabled={mutation.isPending}
      >
        {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
        <span className="font-medium">Re-detect Adapters</span>
      </Button>
      <span className="text-[11px] text-zinc-500 mt-1.5 pr-1 font-medium">Fix adapter keys for all website sources</span>
    </div>
  );
}

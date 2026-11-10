import { Globe, Send, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { isTelegramUrl } from '@/utils/source';

export interface SourceInputSectionProps {
  url: string;
  type: 'telegram' | 'website';
  onUrlChange: (url: string) => void;
  onTypeChange: (type: 'telegram' | 'website') => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  isOptional?: boolean;
  variant?: 'card' | 'dashed';
}

export function SourceInputSection({
  url,
  type,
  onUrlChange,
  onTypeChange,
  onSubmit,
  isSubmitting = false,
  isOptional = false,
  variant = 'card',
}: SourceInputSectionProps) {
  const handleInputChange = (value: string) => {
    onUrlChange(value);
    const trimmed = value.trim();
    if (!trimmed) return;

    if (isTelegramUrl(trimmed)) {
      onTypeChange('telegram');
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('.')) {
      onTypeChange('website');
    }
  };

  const containerCls =
    variant === 'dashed'
      ? 'border border-dashed border-border/50 rounded-xl p-4 mt-4 bg-transparent'
      : 'border border-border/30 rounded-xl p-4 space-y-3 bg-[#0e0f11]';

  return (
    <div className={containerCls}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-white flex items-center gap-2">
          <span className={isOptional ? 'text-zinc-400' : 'text-white'}>Add a source</span>
          {isOptional && (
            <span className="text-[10px] text-zinc-600 font-normal border border-border/40 rounded px-1.5 py-0.5">
              optional
            </span>
          )}
        </p>
        <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-normal">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Detected: <span className="font-semibold text-amber-400 capitalize">{type}</span>
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Switchable source type toggle */}
        <div className="flex rounded-lg bg-[#161719] p-1 border border-border/50 shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onTypeChange('website')}
            aria-label="Website source"
            title="Website"
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              type === 'website'
                ? 'bg-amber-500 text-amber-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Website</span>
          </button>
          <button
            type="button"
            onClick={() => onTypeChange('telegram')}
            aria-label="Telegram source"
            title="Telegram"
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              type === 'telegram'
                ? 'bg-amber-500 text-amber-950 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Telegram</span>
          </button>
        </div>

        {/* URL input and optional submit button */}
        <div className="flex-1 flex gap-2">
          <Input
            type="text"
            value={url}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && onSubmit && url.trim() && !isSubmitting) {
                e.preventDefault();
                onSubmit();
              }
            }}
            placeholder={type === 'telegram' ? '@channel_name or t.me/...' : 'https://asuracomic.net/series/...'}
            className="bg-[#161719] border-border/40 text-white text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-muted-foreground h-10"
          />
          {onSubmit && (
            <Button
              type="button"
              className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-3 shrink-0 rounded-lg h-10"
              onClick={onSubmit}
              disabled={isSubmitting || !url.trim()}
            >
              {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-amber-950/40 border-t-amber-950 rounded-full animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}


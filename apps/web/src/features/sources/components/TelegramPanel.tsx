import { MessageCircle } from "lucide-react";

interface Props {
  telegramSources: { url: string }[];
}

export function TelegramPanel({ telegramSources }: Props) {
  const uniqueChannels = Array.from(new Set(telegramSources.map(s => s.url))).sort();
  return (
    <div className="lg:col-span-3 bg-[#111214] border border-border/20 rounded-xl p-4 flex flex-col min-w-0">
      <div className="flex items-center gap-3 mb-4 border-b border-border/10 pb-3">
        <MessageCircle className="w-4 h-4 text-zinc-400" />
        <h3 className="font-semibold text-zinc-200 text-sm">Telegram Channels</h3>
        <span className="bg-[#161719] text-zinc-400 text-[11px] px-2 py-0.5 rounded-full border border-border/20">
          {uniqueChannels.length} channels
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {uniqueChannels.map(channel => {
          const count = telegramSources.filter(s => s.url === channel).length;
          const label = channel.startsWith('@') ? channel : channel.replace(/^https?:\/\/t\.me\//, '@');
          return (
            <div key={channel} className="shrink-0 flex flex-col items-start px-4 py-2.5 rounded-lg border border-border/20 bg-[#161719]">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#229ED9]" />
                <span className="text-sm font-medium text-zinc-300">{label}</span>
              </div>
              <span className="text-xs text-zinc-500">{count} manhwa</span>
            </div>
          );
        })}
      </div>
      <div className="mt-auto flex items-center gap-2 pt-3 border-t border-border/10 text-xs text-zinc-500">
        <div className="w-1.5 h-1.5 rounded-full bg-[#229ED9]" />
        <span>Telegram sources deliver chapters directly to your tracker via channel monitoring</span>
      </div>
    </div>
  );
}

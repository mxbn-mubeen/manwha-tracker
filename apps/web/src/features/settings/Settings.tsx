import { TelegramSection } from '@/features/settings/components/TelegramSection';
import { SyncHistorySection } from '@/features/settings/components/SyncHistorySection';
import { RecentlyDeletedSection } from '@/features/settings/components/RecentlyDeletedSection';
import { SystemSection } from '@/features/settings/components/SystemSection';
import { usePageTitle } from '@/lib/usePageTitle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Clock, Trash2, Cpu } from 'lucide-react';

export function SettingsPage() {
  usePageTitle('Settings');

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage Telegram bot credentials, sync runs, deleted titles, and background workers.
        </p>
      </div>

      <Tabs defaultValue="telegram" className="w-full">
        <TabsList className="mb-6 bg-[#111214] border border-border/20 p-1 rounded-xl h-auto flex flex-wrap gap-1">
          <TabsTrigger
            value="telegram"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-amber-950 data-[state=active]:font-semibold transition-all btn-press"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram</span>
          </TabsTrigger>
          <TabsTrigger
            value="sync"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-amber-950 data-[state=active]:font-semibold transition-all btn-press"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Sync History</span>
          </TabsTrigger>
          <TabsTrigger
            value="deleted"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-amber-950 data-[state=active]:font-semibold transition-all btn-press"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Recently Deleted</span>
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-amber-950 data-[state=active]:font-semibold transition-all btn-press"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>System & Lock</span>
          </TabsTrigger>
        </TabsList>

        <div className="animate-fade-up" style={{ '--i': 0 } as React.CSSProperties}>
          <TabsContent value="telegram">
            <TelegramSection />
          </TabsContent>
          <TabsContent value="sync">
            <SyncHistorySection />
          </TabsContent>
          <TabsContent value="deleted">
            <RecentlyDeletedSection />
          </TabsContent>
          <TabsContent value="system">
            <SystemSection />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

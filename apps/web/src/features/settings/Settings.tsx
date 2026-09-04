import { TelegramSection } from '@/features/settings/components/TelegramSection';
import { SyncHistorySection } from '@/features/settings/components/SyncHistorySection';
import { RecentlyDeletedSection } from '@/features/settings/components/RecentlyDeletedSection';
import { SystemSection } from '@/features/settings/components/SystemSection';
import { usePageTitle } from '@/lib/usePageTitle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SettingsPage() {
  usePageTitle('Settings');
  return (
    <div className="space-y-8 pb-10 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your tracker configuration</p>
      </div>

      <Tabs defaultValue="telegram" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="telegram">Telegram Bot</TabsTrigger>
          <TabsTrigger value="sync">Sync History</TabsTrigger>
          <TabsTrigger value="deleted">Recently Deleted</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
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
      </Tabs>
    </div>
  );
}

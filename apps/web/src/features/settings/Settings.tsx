import { TelegramSection } from '@/features/settings/components/TelegramSection';

export function SettingsPage() {
  return (
    <div className="space-y-8 pb-10 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your tracker configuration</p>
      </div>

      <TelegramSection />
    </div>
  );
}

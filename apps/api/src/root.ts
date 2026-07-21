import { createTRPCRouter } from './trpc';
import { manhwaRouter } from './modules/manhwa/manhwa.router';
import { syncRouter } from './modules/sync/sync.router';
import { settingsRouter } from './modules/settings/settings.router';

export const appRouter = createTRPCRouter({
  manhwa: manhwaRouter,
  sync: syncRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;

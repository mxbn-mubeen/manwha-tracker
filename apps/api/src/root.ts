import { createTRPCRouter } from './trpc';
import { manhwaRouter } from './modules/manhwa/manhwa.router';
import { syncRouter } from './modules/sync/sync.router';
import { settingsRouter } from './modules/settings/settings.router';
import { statsRouter } from './modules/stats/stats.router';

export const appRouter = createTRPCRouter({
  manhwa: manhwaRouter,
  sync: syncRouter,
  settings: settingsRouter,
  stats: statsRouter,
});

export type AppRouter = typeof appRouter;

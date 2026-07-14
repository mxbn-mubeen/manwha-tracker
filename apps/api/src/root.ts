import { createTRPCRouter } from './trpc';
import { manhwaRouter } from './modules/manhwa/manhwa.router';

export const appRouter = createTRPCRouter({
  manhwa: manhwaRouter,
});

export type AppRouter = typeof appRouter;

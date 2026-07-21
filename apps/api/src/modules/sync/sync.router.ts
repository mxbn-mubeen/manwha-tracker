import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../../trpc';
import { SyncService } from './sync.service';

const service = new SyncService();

/** Shared input contract for triggering a sync — used by both the tRPC mutation
 *  (navbar "Sync" button) and the secret-protected REST route (GitHub Actions cron). */
export const TriggerSyncSchema = z.object({
  scope: z.enum(['telegram', 'websites', 'all']).default('all'),
});

export const syncRouter = createTRPCRouter({
  /** Triggered by the "Sync" button in the navbar. Single-user app — no auth needed. */
  run: publicProcedure
    .input(TriggerSyncSchema.optional())
    .mutation(async ({ input }) => {
      return await service.run(input?.scope ?? 'all');
    }),
});

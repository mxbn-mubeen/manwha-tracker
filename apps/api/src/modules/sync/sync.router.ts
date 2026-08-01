import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../../trpc';
import { SyncService } from './sync.service';
import { toSafeError } from '../../utils/trpc-error';

const service = new SyncService();

/** Shared input contract for triggering a sync — used by both the tRPC mutation
 *  (navbar "Sync" button) and the secret-protected REST route (GitHub Actions cron). */
export const TriggerSyncSchema = z.object({
  scope: z.enum(['telegram', 'websites', 'all']).default('all'),
});

export const syncRouter = createTRPCRouter({
  /** Triggered by the "Sync" button in the navbar. Protected by the
   *  APP_SECRET middleware applied to all publicProcedures — see trpc.ts. */
  run: publicProcedure
    .input(TriggerSyncSchema.optional())
    .mutation(async ({ input }) => {
      try {
        return await service.run(input?.scope ?? 'all');
      } catch (err) {
        // Per-source failures are already caught inside SyncService and sanitized
        // into result.errors — reaching here means something broke outside that
        // loop (e.g. the initial getActiveSources DB call).
        throw toSafeError(err, 'sync.run');
      }
    }),
});
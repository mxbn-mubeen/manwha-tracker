import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../../trpc';
import { getSyncHistory, getIsSyncing } from './sync.service';

/** Shared input schema — also used by the worker's sync.run endpoint. */
export const TriggerSyncSchema = z.object({
  scope: z.enum(['telegram', 'websites', 'all']).default('all'),
});

export const syncRouter = createTRPCRouter({
  /** Returns last 20 sync runs (newest first) from the database. */
  getHistory: publicProcedure.query(async () => getSyncHistory()),

  /** Returns whether a sync is currently running. State is stored in the DB
   *  (key: sys_is_syncing) so both this API and the worker share the same lock. */
  isSyncing: publicProcedure.query(async () => await getIsSyncing()),
});
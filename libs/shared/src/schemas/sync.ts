import { z } from 'zod';

export const TriggerSyncSchema = z.object({
  secret: z.string().min(1),
  sources: z.array(z.enum(['telegram', 'websites', 'all'])).default(['all']),
});

export type TriggerSyncInput = z.infer<typeof TriggerSyncSchema>;

export const SyncResultSchema = z.object({
  newChapters: z.number(),
  updatedSources: z.number(),
  errors: z.array(z.string()),
  duration: z.number(), // ms
});

export type SyncResult = z.infer<typeof SyncResultSchema>;

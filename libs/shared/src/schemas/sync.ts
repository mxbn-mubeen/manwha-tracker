import { z } from 'zod';

export const TriggerSyncSchema = z.object({
  secret: z.string().min(1),
  sources: z.array(z.enum(['telegram', 'websites', 'all'])).default(['all']),
});

export type TriggerSyncInput = z.infer<typeof TriggerSyncSchema>;

export const LegacySyncResultSchema = z.object({
  newChapters: z.number().default(0),
  updatedManhwa: z.number().default(0),
  skippedTelegram: z.number().default(0),
  skippedSchedule: z.number().default(0),
  errors: z.array(z.string()).default([]),
  duration: z.number(), // ms
});

export type LegacySyncResult = z.infer<typeof LegacySyncResultSchema>;

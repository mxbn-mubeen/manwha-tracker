import { z } from 'zod';

export const UpdateProgressSchema = z.object({
  manhwaId: z.number().int().positive(),
  chapterNum: z.number().nonnegative(),
  chapterId: z.number().int().positive().optional(),
  isCompleted: z.boolean().optional().default(false),
});

export type UpdateProgressInput = z.infer<typeof UpdateProgressSchema>;

// Used by the browser extension REST endpoint
export const ExtensionProgressSchema = z.object({
  title: z.string().min(1),
  chapterNum: z.number().nonnegative(),
  sourceUrl: z.string().url(),
});

export type ExtensionProgressInput = z.infer<typeof ExtensionProgressSchema>;

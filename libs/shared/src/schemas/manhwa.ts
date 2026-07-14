import { z } from 'zod';

export const AddManhwaSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  coverUrl: z.string().url().nullable().optional(),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'dropped']).default('ongoing'),
  genres: z.array(z.string()).default([]),
  description: z.string().nullable().optional(),
});

export const UpdateManhwaSchema = AddManhwaSchema.partial().extend({
  id: z.number().int().positive(),
});

export type AddManhwaInput = z.infer<typeof AddManhwaSchema>;
export type UpdateManhwaInput = z.infer<typeof UpdateManhwaSchema>;

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../../trpc';
import { ManhwaService } from './manhwa.service';

const service = new ManhwaService();

export const manhwaRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    return await service.getAll();
  }),

  addFromUrl: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      return await service.addFromUrl(input.url);
    }),
});

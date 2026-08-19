import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../../trpc';
import { ManhwaService } from './manhwa.service';
import { toSafeError } from '../../utils/trpc-error';


const service = new ManhwaService();

export const manhwaRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    return await service.getAll();
  }),

  addFromUrl: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      try {
        return await service.addFromUrl(input.url);
      } catch (err) {
        throw toSafeError(err, 'manhwa.addFromUrl');
      }
    }),

  create: publicProcedure
    .input(z.object({
      title: z.string().min(1),
      coverUrl: z.string().max(7500000).optional(),
      description: z.string().optional(),
      genres: z.array(z.string()).optional(),
      status: z.enum(['ongoing', 'completed', 'hiatus', 'dropped']).optional(),
      lastChapter: z.number().optional(),
      latestChapter: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await service.create(input);
      } catch (err) {
        throw toSafeError(err, 'manhwa.create');
      }
    }),

  update: publicProcedure
    .input(z.object({
      id: z.coerce.number().int().positive(),
      title: z.string().min(1).optional(),
      coverUrl: z.string().max(7500000).optional(),
      description: z.string().optional(),
      genres: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      try {
        return await service.update(id, data);
      } catch (err) {
        throw toSafeError(err, 'manhwa.update');
      }
    }),

  updateStatus: publicProcedure
    .input(z.object({
      id: z.coerce.number().int().positive(),
      status: z.enum(['ongoing', 'completed', 'hiatus', 'dropped']),
    }))
    .mutation(async ({ input }) => {
      try {
        return await service.updateStatus(input.id, input.status);
      } catch (err) {
        throw toSafeError(err, 'manhwa.updateStatus');
      }
    }),

  updateLatestChapter: publicProcedure
    .input(z.object({
      id: z.coerce.number().int().positive(),
      chapterNum: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      try {
        return await service.setLatestChapter(input.id, input.chapterNum);
      } catch (err) {
        throw toSafeError(err, 'manhwa.updateLatestChapter');
      }
    }),

  getById: publicProcedure
    .input(z.coerce.number().int().positive())
    .query(async ({ input }) => {
      return await service.getById(input);
    }),

  updateProgress: publicProcedure
    .input(z.object({
      manhwaId: z.coerce.number().int().positive(),
      chapter: z.number()
    }))
    .mutation(async ({ input }) => {
      try {
        return await service.updateProgress(input.manhwaId, input.chapter);
      } catch (err) {
        throw toSafeError(err, 'manhwa.updateProgress');
      }
    }),

  delete: publicProcedure
    .input(z.coerce.number().int().positive())
    .mutation(async ({ input }) => {
      try {
        return await service.delete(input);
      } catch (err) {
        throw toSafeError(err, 'manhwa.delete');
      }
    }),

  recover: publicProcedure
    .input(z.coerce.number().int().positive())
    .mutation(async ({ input }) => {
      try {
        return await service.recover(input);
      } catch (err) {
        throw toSafeError(err, 'manhwa.recover');
      }
    }),

  getDeleted: publicProcedure
    .query(async () => {
      return await service.getDeleted();
    }),

  addSource: publicProcedure
    .input(z.object({
      manhwaId: z.coerce.number().int().positive(),
      url: z.string().min(1),
      type: z.enum(['telegram', 'website']),
    }).superRefine((data, ctx) => {
      const isTelegramFormat = data.url.startsWith('@') || data.url.includes('t.me');
      if (data.type === 'telegram' && !isTelegramFormat) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Telegram source must be a @channel or t.me URL", path: ['url'] });
      }
      if (data.type === 'website' && isTelegramFormat) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Website source cannot be a Telegram URL", path: ['url'] });
      }
      if (data.type === 'website' && !data.url.startsWith('http')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Website source must be a valid HTTP URL", path: ['url'] });
      }
    }))
    .mutation(async ({ input }) => {
      try {
        return await service.addSource(input.manhwaId, input.url, input.type);
      } catch (err) {
        throw toSafeError(err, 'manhwa.addSource');
      }
    }),

  removeSource: publicProcedure
    .input(z.object({
      manhwaId: z.coerce.number().int().positive(),
      url: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      try {
        return await service.removeSource(input.manhwaId, input.url);
      } catch (err) {
        throw toSafeError(err, 'manhwa.removeSource');
      }
    }),

  getTelegramCount: publicProcedure.query(async () => {
    return await service.getTelegramCount();
  }),

  getChapters: publicProcedure
    .input(z.coerce.number().int().positive())
    .query(async ({ input }) => {
      return await service.getChapters(input);
    }),

  deleteChapter: publicProcedure
    .input(z.coerce.number().int().positive())
    .mutation(async ({ input }) => {
      try {
        return await service.deleteChapter(input);
      } catch (err) {
        throw toSafeError(err, 'manhwa.deleteChapter');
      }
    }),
});
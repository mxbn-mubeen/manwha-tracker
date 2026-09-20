import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { SettingsRepository } from '@manhwa-tracker/database';
import { TRPCError } from "@trpc/server";


const repo = new SettingsRepository();
const ALLOWED_KEYS = new Set([
  "START_TELEGRAM_WATCHER",
  "START_TELEGRAM_BOT"
]);

export const settingsRouter = createTRPCRouter({
  /** Get a single setting value by key. Returns null if not set. */
  get: publicProcedure
    .input(z.string().min(1))
    .query(async ({ input: key }) => {
      // Allow reading any key, but maybe hide sensitive values?
      // Since telegram_session is binary, we shouldn't return it anyway.
      if (key === "telegram_session" || key === "telegram_phone_hint") return null;
      return await repo.get(key);
    }),

  /** Upsert a setting value. */
  set: publicProcedure
    .input(z.object({ key: z.string().min(1), value: z.string() }))
    .mutation(async ({ input }) => {
      if (!ALLOWED_KEYS.has(input.key)) throw new TRPCError({ code: "FORBIDDEN", message: "Key not in allowlist" });
      await repo.set(input.key, input.value);
      return { ok: true };
    }),

  /** Delete a setting. */
  delete: publicProcedure
    .input(z.string().min(1))
    .mutation(async ({ input: key }) => {
      if (!ALLOWED_KEYS.has(key)) throw new TRPCError({ code: "FORBIDDEN", message: "Key not in allowlist" });
      await repo.delete(key);
      return { ok: true };
    }),

  // ── Telegram in-app login flow (handled by worker via splitLink) ──
  startTelegramLogin: publicProcedure
    .input(z.object({ phone: z.string().min(7) }))
    .mutation(async (): Promise<{ tempId: string }> => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Handled by worker' });
    }),

  verifyTelegramCode: publicProcedure
    .input(z.object({
      tempId: z.string(),
      code: z.string().min(4).max(8),
      password: z.string().optional(),
    }))
    .mutation(async (): Promise<{ ok: boolean; needs2FA: boolean; tempId?: string }> => {
      throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Handled by worker' });
    }),

  telegramStatus: publicProcedure.query(async (): Promise<{ source: 'database' | 'env' | 'none'; connected: boolean; phone: string | null }> => {
    throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Handled by worker' });
  }),

  disconnectTelegram: publicProcedure.mutation(async (): Promise<{ ok: boolean }> => {
    throw new TRPCError({ code: 'NOT_IMPLEMENTED', message: 'Handled by worker' });
  }),
});

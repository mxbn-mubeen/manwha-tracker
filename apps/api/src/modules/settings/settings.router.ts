import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { SettingsRepository } from '@manhwa-tracker/database';
import { TRPCError } from "@trpc/server";
import { startTelegramLogin, verifyTelegramCode, telegramStatus, disconnectTelegram } from "./telegram-auth.procedures";

const repo = new SettingsRepository();
const SENSITIVE_KEYS = new Set(["telegram_session"]);

export const settingsRouter = createTRPCRouter({
  /** Get a single setting value by key. Returns null if not set. */
  get: publicProcedure
    .input(z.string().min(1))
    .query(async ({ input: key }) => {
      if (SENSITIVE_KEYS.has(key)) throw new TRPCError({ code: "FORBIDDEN", message: "Forbidden" });
      return await repo.get(key);
    }),

  /** Upsert a setting value. */
  set: publicProcedure
    .input(z.object({ key: z.string().min(1), value: z.string() }))
    .mutation(async ({ input }) => {
      if (SENSITIVE_KEYS.has(input.key)) throw new TRPCError({ code: "FORBIDDEN", message: "Forbidden" });
      await repo.set(input.key, input.value);
      return { ok: true };
    }),

  /** Delete a setting. */
  delete: publicProcedure
    .input(z.string().min(1))
    .mutation(async ({ input: key }) => {
      if (SENSITIVE_KEYS.has(key)) throw new TRPCError({ code: "FORBIDDEN", message: "Forbidden" });
      await repo.delete(key);
      return { ok: true };
    }),

  // ── Telegram in-app login flow (procedures defined in telegram-auth.procedures.ts) ──
  startTelegramLogin,
  verifyTelegramCode,
  telegramStatus,
  disconnectTelegram,
});

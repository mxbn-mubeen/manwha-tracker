/**
 * Telegram MTProto authentication flow procedures.
 * Separated from settings.router.ts to keep each file under 230 lines.
 */
import { z } from "zod";
import { publicProcedure } from "../../trpc";
import { SettingsRepository } from '@manhwa-tracker/database';
import { TelegramClient, Api } from "teleproto";
import { randomUUID } from "crypto";
import { connectTelegramClient } from "../../utils/telegram-client";
import { TRPCError } from "@trpc/server";
import { toSafeTelegramError } from "../../utils/trpc-error";

const repo = new SettingsRepository();

// ── In-memory store for in-progress Telegram auth sessions ────────────────────
// Keyed by a random tempId issued to the client after SendCode. Auto-expires after 5 min.
type PendingLogin = {
  client: TelegramClient;
  phoneCodeHash: string;
  phone: string;
};
const pendingLogins = new Map<string, PendingLogin>();

function getApiCreds() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
  const apiHash = process.env.TELEGRAM_API_HASH || "";
  if (!apiId || !apiHash) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Telegram isn't configured on the server yet (missing TELEGRAM_API_ID / TELEGRAM_API_HASH).",
    });
  }
  return { apiId, apiHash };
}

/**
 * Step 1 — send OTP to the phone number.
 * Returns a tempId the client must pass to verifyTelegramCode.
 */
export const startTelegramLogin = publicProcedure
  .input(z.object({ phone: z.string().min(7) }))
  .mutation(async ({ input }) => {
    const { apiId, apiHash } = getApiCreds();

    let client: TelegramClient;
    try {
      ({ client } = await connectTelegramClient({ session: "", apiId, apiHash, options: { connectionRetries: 3 } }));
    } catch (err) {
      throw toSafeTelegramError(err, "settings.startTelegramLogin.connect");
    }

    let result;
    try {
      result = await client.invoke(new Api.auth.SendCode({
        phoneNumber: input.phone,
        apiId,
        apiHash,
        settings: new Api.CodeSettings({}),
      }));
    } catch (err) {
      await client.disconnect().catch(() => {});
      throw toSafeTelegramError(err, "settings.startTelegramLogin");
    }

    const tempId = randomUUID();
    pendingLogins.set(tempId, {
      client,
      phoneCodeHash: (result as Api.auth.SentCode).phoneCodeHash,
      phone: input.phone,
    });

    setTimeout(() => {
      const p = pendingLogins.get(tempId);
      if (p) { p.client.disconnect().catch(() => {}); pendingLogins.delete(tempId); }
    }, 5 * 60 * 1000);

    return { tempId };
  });

/**
 * Step 2 — verify OTP (and optionally 2FA password).
 * Returns { ok: true } on success, { needs2FA: true } if password needed.
 */
export const verifyTelegramCode = publicProcedure
  .input(z.object({
    tempId: z.string(),
    code: z.string().min(4).max(8),
    password: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    const pending = pendingLogins.get(input.tempId);
    if (!pending) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Login session expired or not found. Please start again." });
    }

    try {
      await pending.client.invoke(new Api.auth.SignIn({
        phoneNumber: pending.phone,
        phoneCodeHash: pending.phoneCodeHash,
        phoneCode: input.code,
      }));
    } catch (err: unknown) {
      const errorMsg = (err as { errorMessage?: string }).errorMessage ?? "";

      if (errorMsg === "SESSION_PASSWORD_NEEDED") {
        if (!input.password) return { ok: false, needs2FA: true, tempId: input.tempId };

        const passwordInfo = await pending.client.invoke(new Api.account.GetPassword());
        const { computeCheck } = await import("teleproto/Password");
        try {
          const srp = await computeCheck(passwordInfo as Parameters<typeof computeCheck>[0], input.password);
          await pending.client.invoke(new Api.auth.CheckPassword({ password: srp }));
        } catch (pwErr) {
          await pending.client.disconnect().catch(() => {});
          pendingLogins.delete(input.tempId);
          throw toSafeTelegramError(pwErr, "settings.verifyTelegramCode.2fa");
        }
      } else {
        await pending.client.disconnect().catch(() => {});
        pendingLogins.delete(input.tempId);
        throw toSafeTelegramError(err, "settings.verifyTelegramCode.signIn");
      }
    }

    const session = pending.client.session.save() as unknown as string;
    await repo.set("telegram_session", session);
    await pending.client.disconnect().catch(() => {});
    pendingLogins.delete(input.tempId);

    return { ok: true, needs2FA: false };
  });

/**
 * Get the current Telegram session status.
 * Returns source ('database' | 'env' | 'none'), connected, phone.
 */
export const telegramStatus = publicProcedure.query(async () => {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
  const apiHash = process.env.TELEGRAM_API_HASH || "";

  const dbSession = await repo.get("telegram_session");
  const envSession = process.env.TELEGRAM_SESSION || "";
  const session = dbSession || envSession;
  const source = dbSession ? "database" : envSession ? "env" : "none";

  if (!session || !apiId || !apiHash) return { source, connected: false, phone: null };

  try {
    const { client } = await connectTelegramClient({ session, apiId, apiHash, options: { connectionRetries: 1, autoReconnect: false } });
    try {
      const me = await client.getMe();
      const phone = (me as { phone?: string }).phone ?? null;
      return { source, connected: true, phone };
    } finally {
      await client.disconnect().catch(() => {});
    }
  } catch {
    return { source, connected: false, phone: null };
  }
});

/**
 * The only legitimate way to remove the saved session.
 * settings.delete can't touch this key (SENSITIVE_KEYS protection).
 */
export const disconnectTelegram = publicProcedure.mutation(async () => {
  await repo.delete("telegram_session");
  return { ok: true };
});

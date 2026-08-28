import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { SettingsRepository } from '@manhwa-tracker/database';
import { TelegramClient, Api } from "teleproto";
import { randomUUID } from "crypto";
import { connectTelegramClient } from "../../utils/telegram-client";
import { TRPCError } from "@trpc/server";
import { toSafeTelegramError } from "../../utils/trpc-error";

const repo = new SettingsRepository();

// ── In-memory store for in-progress Telegram auth sessions ────────────────────
// Keyed by a random tempId issued to the client after SendCode.
// Auto-expires after 5 minutes.
type PendingLogin = {
  client: TelegramClient;
  phoneCodeHash: string;
  phone: string;
};
const pendingLogins = new Map<string, PendingLogin>();

function makeTempId() {
  return randomUUID();
}

function getApiCreds() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
  const apiHash = process.env.TELEGRAM_API_HASH || "";
  if (!apiId || !apiHash) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Telegram isn't configured on the server yet (missing TELEGRAM_API_ID / TELEGRAM_API_HASH).",
    });
  }
  return { apiId, apiHash };
}

const SENSITIVE_KEYS = new Set(["telegram_session"]);

export const settingsRouter = createTRPCRouter({
  /** Get a single setting value by key. Returns null if not set. */
  get: publicProcedure
    .input(z.string().min(1))
    .query(async ({ input: key }) => {
      if (SENSITIVE_KEYS.has(key))
        throw new TRPCError({ code: "FORBIDDEN", message: "Forbidden" });
      return await repo.get(key);
    }),

  /** Upsert a setting value. */
  set: publicProcedure
    .input(z.object({ key: z.string().min(1), value: z.string() }))
    .mutation(async ({ input }) => {
      if (SENSITIVE_KEYS.has(input.key))
        throw new TRPCError({ code: "FORBIDDEN", message: "Forbidden" });
      await repo.set(input.key, input.value);
      return { ok: true };
    }),

  /** Delete a setting. */
  delete: publicProcedure
    .input(z.string().min(1))
    .mutation(async ({ input: key }) => {
      if (SENSITIVE_KEYS.has(key))
        throw new TRPCError({ code: "FORBIDDEN", message: "Forbidden" });
      await repo.delete(key);
      return { ok: true };
    }),

  // ── Telegram in-app login flow ─────────────────────────────────────────────

  /**
   * Step 1 — send OTP to the phone number.
   * Returns a tempId the client must pass to verifyTelegramCode.
   */
  startTelegramLogin: publicProcedure
    .input(z.object({ phone: z.string().min(7) }))
    .mutation(async ({ input }) => {
      const { apiId, apiHash } = getApiCreds();

      let client: TelegramClient;
      try {
        ({ client } = await connectTelegramClient({
          session: "",
          apiId,
          apiHash,
          options: {
            connectionRetries: 3,
          },
        }));
      } catch (err) {
        throw toSafeTelegramError(err, "settings.startTelegramLogin.connect");
      }

      let result;
      try {
        result = await client.invoke(
          new Api.auth.SendCode({
            phoneNumber: input.phone,
            apiId,
            apiHash,
            settings: new Api.CodeSettings({}),
          }),
        );
      } catch (err) {
        await client.disconnect().catch(() => {});
        throw toSafeTelegramError(err, "settings.startTelegramLogin");
      }

      const tempId = makeTempId();
      pendingLogins.set(tempId, {
        client,
        phoneCodeHash: (result as Api.auth.SentCode).phoneCodeHash,
        phone: input.phone,
      });

      // Auto-cleanup after 5 minutes so stale clients don't linger
      setTimeout(
        () => {
          const p = pendingLogins.get(tempId);
          if (p) {
            p.client.disconnect().catch(() => {});
            pendingLogins.delete(tempId);
          }
        },
        5 * 60 * 1000,
      );

      return { tempId };
    }),

  /**
   * Step 2 — verify OTP (and optionally 2FA password if Telegram requires it).
   *
   * Returns one of:
   *   { ok: true }                     → signed in, session saved to DB
   *   { needs2FA: true, tempId: '...' } → 2FA password required, call again with `password`
   */
  verifyTelegramCode: publicProcedure
    .input(
      z.object({
        tempId: z.string(),
        code: z.string().min(4).max(8),
        /** Only needed on the second call when needs2FA was true */
        password: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const pending = pendingLogins.get(input.tempId);
      if (!pending) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Login session expired or not found. Please start again.",
        });
      }

      // Try signing in with the OTP
      try {
        await pending.client.invoke(
          new Api.auth.SignIn({
            phoneNumber: pending.phone,
            phoneCodeHash: pending.phoneCodeHash,
            phoneCode: input.code,
          }),
        );
      } catch (err: unknown) {
        const errorMsg = (err as { errorMessage?: string }).errorMessage ?? "";

        if (errorMsg === "SESSION_PASSWORD_NEEDED") {
          // 2FA required
          if (!input.password) {
            // Tell the client to ask for the password — keep tempId alive
            return { ok: false, needs2FA: true, tempId: input.tempId };
          }

          // User supplied the 2FA password — compute SRP check
          const passwordInfo = await pending.client.invoke(
            new Api.account.GetPassword(),
          );
          const { computeCheck } = await import("teleproto/Password");
          try {
            const srp = await computeCheck(
              passwordInfo as Parameters<typeof computeCheck>[0],
              input.password,
            );
            await pending.client.invoke(
              new Api.auth.CheckPassword({ password: srp }),
            );
          } catch (pwErr) {
            await pending.client.disconnect().catch(() => {});
            pendingLogins.delete(input.tempId);
            throw toSafeTelegramError(pwErr, "settings.verifyTelegramCode.2fa");
          }
        } else {
          // Wrong code or other hard error — clean up and surface
          await pending.client.disconnect().catch(() => {});
          pendingLogins.delete(input.tempId);
          throw toSafeTelegramError(err, "settings.verifyTelegramCode.signIn");
        }
      }

      // Signed in — persist session to DB
      const session = pending.client.session.save() as unknown as string;
      await repo.set("telegram_session", session);

      await pending.client.disconnect().catch(() => {});
      pendingLogins.delete(input.tempId);

      return { ok: true, needs2FA: false };
    }),

  /**
   * Get the current Telegram session status:
   *   source: 'database' | 'env' | 'none'
   *   connected: boolean (actually tested against Telegram)
   *   phone: string | null
   */
  telegramStatus: publicProcedure.query(async () => {
    const apiId = parseInt(process.env.TELEGRAM_API_ID || "0");
    const apiHash = process.env.TELEGRAM_API_HASH || "";

    const dbSession = await repo.get("telegram_session");
    const envSession = process.env.TELEGRAM_SESSION || "";
    const session = dbSession || envSession;
    const source = dbSession ? "database" : envSession ? "env" : "none";

    if (!session || !apiId || !apiHash) {
      return { source, connected: false, phone: null };
    }

    try {
      const { client } = await connectTelegramClient({
        session,
        apiId,
        apiHash,
        options: {
          connectionRetries: 1,
          autoReconnect: false,
        },
      });
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
  }),

  /**
   * The one legitimate way to remove the saved Telegram session.
   * settings.delete deliberately can't touch this key (SENSITIVE_KEYS) so a
   * stranger can't wipe it via the generic endpoint — this is the dedicated,
   * intentional removal path the Settings UI actually calls.
   */
  disconnectTelegram: publicProcedure.mutation(async () => {
    await repo.delete("telegram_session");
    return { ok: true };
  }),
});

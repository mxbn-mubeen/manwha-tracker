import { TRPCError } from '@trpc/server';

/**
 * Turn a caught error into a clean TRPCError.
 *
 * Two separate audiences, two separate messages:
 *  - SERVER LOG: the full original error (message + stack + any driver code),
 *    tagged with `context` so it's greppable in Railway/Vercel logs.
 *  - CLIENT: a short, safe, actionable message. Raw Postgres errors, fetch
 *    stack traces, and third-party parser internals never leave this function —
 *    only the handful of cases below get a specific message; everything else
 *    collapses to a generic "something went wrong."
 *
 * Usage:
 *   try {
 *     return await service.addFromUrl(input.url);
 *   } catch (err) {
 *     throw toSafeError(err, 'manhwa.addFromUrl');
 *   }
 */
export function toSafeError(err: unknown, context: string): TRPCError {
    console.error(`[api:${context}]`, err);

    // Already deliberately thrown/shaped (e.g. by another layer) — don't double-wrap.
    if (err instanceof TRPCError) return err;

    const pgCode = (err as { code?: string } | undefined)?.code;
    const message = err instanceof Error ? err.message : String(err);

    // Postgres unique_violation — e.g. duplicate slug/url that a plain insert (no upsert) hit.
    if (pgCode === '23505') {
        return new TRPCError({ code: 'CONFLICT', message: 'That already exists.' });
    }
    // Postgres foreign_key_violation — referencing a manhwa/source/chapter that's gone.
    if (pgCode === '23503') {
        return new TRPCError({ code: 'BAD_REQUEST', message: 'That references something that no longer exists.' });
    }
    // Network-level failures from the scraper hitting a third-party site.
    if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timed? ?out/i.test(message)) {
        return new TRPCError({ code: 'BAD_GATEWAY', message: 'Could not reach that site. Check the URL and try again.' });
    }
    // Parser/adapter explicitly declining an unsupported site.
    if (/unsupported|no adapter|not supported/i.test(message)) {
        return new TRPCError({ code: 'BAD_REQUEST', message: "That site isn't supported yet." });
    }

    // Unknown shape — never forward raw driver/stack text to the client.
    return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong on our end. Please try again.' });
}

// ── Telegram / gramJS (MTProto) errors ──────────────────────────────────────
// gramJS surfaces Telegram's RPC error codes on `err.errorMessage` (e.g.
// "PHONE_CODE_INVALID"), while `err.message` is usually something like
// "PHONE_CODE_INVALID (caused by auth.SignIn)" — neither is something a
// non-technical user should see verbatim.
const TELEGRAM_ERROR_MESSAGES: Record<string, string> = {
    PHONE_NUMBER_INVALID: "That phone number doesn't look valid. Use international format, e.g. +919876543210.",
    PHONE_NUMBER_BANNED: 'This phone number has been banned by Telegram.',
    PHONE_NUMBER_FLOOD: 'Too many login attempts for this number. Wait a while before trying again.',
    PHONE_CODE_INVALID: "That code is incorrect. Double-check the digits and try again.",
    PHONE_CODE_EXPIRED: 'That code expired. Go back and request a new one.',
    PASSWORD_HASH_INVALID: 'Incorrect Two-Step Verification password.',
    API_ID_INVALID: 'Server misconfiguration: invalid Telegram API credentials.',
};

/**
 * Same idea as toSafeError, but for errors coming out of gramJS/MTProto calls
 * (SendCode, SignIn, CheckPassword, etc.) during the Telegram login flow.
 */
export function toSafeTelegramError(err: unknown, context: string): TRPCError {
    console.error(`[api:${context}]`, err);

    if (err instanceof TRPCError) return err;

    const code = (err as { errorMessage?: string } | undefined)?.errorMessage ?? '';

    const floodMatch = code.match(/^FLOOD_WAIT_(\d+)$/);
    if (floodMatch) {
        return new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: `Telegram is rate-limiting login attempts. Try again in ${floodMatch[1]}s.`,
        });
    }

    if (code && TELEGRAM_ERROR_MESSAGES[code]) {
        return new TRPCError({ code: 'BAD_REQUEST', message: TELEGRAM_ERROR_MESSAGES[code] });
    }

    // Unrecognized RPC error — never forward the raw "(caused by auth.SignIn)" text.
    return new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not complete the Telegram login. Please try again.',
    });
}

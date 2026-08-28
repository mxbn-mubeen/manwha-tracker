import { sendBotAlert } from '../../utils/bot-alert';
import { SettingsRepository } from '@manhwa-tracker/database';

const settingsRepo = new SettingsRepository();

/**
 * Thrown by resolveSession() when no session is configured yet. Distinct
 * from a generic Error so callers can tell "not logged in yet" (recoverable —
 * keep the API server up so Settings → Telegram can be used to fix it) apart
 * from a genuine unexpected failure.
 */
export class NoSessionError extends Error {
  constructor() {
    super(
      'No Telegram session found. Go to Settings → Telegram in the app and log in with your phone number.',
    );
    this.name = 'NoSessionError';
  }
}

export async function resolveSession(): Promise<string> {
  const dbSession = await settingsRepo.get('telegram_session');
  if (dbSession) {
    console.log('[watcher] Using Telegram session from database settings.');
    return dbSession;
  }
  const envSession = process.env.TELEGRAM_SESSION ?? '';
  if (envSession) {
    console.log('[watcher] Using Telegram session from TELEGRAM_SESSION env.');
    return envSession;
  }
  // IMPORTANT: never process.exit() here. This module can run embedded inside
  // the main API server process (see server.ts) — exiting the process over a
  // merely-not-logged-in-yet condition would kill the API server and the bot
  // along with the watcher, taking down the very Settings → Telegram page
  // needed to fix it. Throw instead and let the caller decide what "not
  // running yet" looks like for its context.
  throw new NoSessionError();
}

/**
 * Console marker for an unresolvable source. Also sends a bot alert for
 * FloodWait events (high-impact, actionable) — skips per-source noise so
 * the bot doesn't spam for every private channel on a fresh session.
 */
export function alertUnresolvable(sourceUrl: string, reason: string, sendToBot = false) {
  console.error(`[watcher] WATCHER_ALERT source="${sourceUrl}" reason="${reason}"`);
  if (sendToBot) {
    sendBotAlert(
      `⚠️ <b>Watcher alert</b>\n\nSource: <code>${sourceUrl}</code>\nReason: ${reason}`,
    ).catch(() => { });
  }
}

// RPCError messages that mean the MTProto session itself is dead — not a
// per-source problem, and no retry loop fixes it. A fresh session string
// (Settings → Telegram, or `npm run login:telegram`) is required either way.
const SESSION_DEATH_MARKERS = [
  'AUTH_KEY_UNREGISTERED',
  'AUTH_KEY_DUPLICATED',
  'SESSION_REVOKED',
  'SESSION_EXPIRED',
  'USER_DEACTIVATED',
  'USER_DEACTIVATED_BAN',
];

export function isSessionDeathError(err: any): string | null {
  const message = (err?.errorMessage as string | undefined) ?? (err instanceof Error ? err.message : String(err));
  const marker = SESSION_DEATH_MARKERS.find((m) => message.includes(m));
  return marker ?? null;
}

let sessionDeathAlertSent = false;

/**
 * Call when the MTProto session is confirmed dead.
 *
 * @param marker   - The error code, e.g. AUTH_KEY_DUPLICATED
 * @param onShutdown - Optional callback to run after the alert is sent.
 *   When running as a standalone script pass `() => process.exit(1)`.
 *   When embedded in the API server, pass a callback that only stops
 *   the watcher (disconnect the client, clear intervals) — do NOT pass
 *   process.exit because that would kill the whole API server.
 */
export function handleSessionDeath(marker: string, onShutdown?: () => void) {
  if (sessionDeathAlertSent) return; // fire once, not on every subsequent call that hits the same dead session
  sessionDeathAlertSent = true;

  const msg =
    `🔴 <b>Telegram Session Terminated</b>\n\n` +
    `📛 <b>Error</b>\n${marker}\n\n` +
    `⚠️ The session can no longer read any tracked channel.\n\n` +
    `✅ Go to <b>Settings → Telegram</b> or run <code>npm run login:telegram</code> to generate a fresh session, then restart the watcher.`;

  const embedded = !onShutdown; // running inside API server — don't exit the process
  console.error(
    `\n🔴 Telegram Session Terminated\n\n` +
    `📛 Error\n${marker}\n\n` +
    `⚠️ The session can no longer read any tracked channel.\n\n` +
    `✅ Generate a fresh session (Settings → Telegram, or \`npm run login:telegram\`) and restart the watcher.\n` +
    (embedded
      ? `   The watcher will stop. The API server keeps running.\n`
      : `   The process will now exit to prevent infinite retry loops.\n`),
  );

  // Fire-and-forget: send the alert then invoke the shutdown callback.
  const timeout = new Promise<void>((r) => setTimeout(r, 10_000));
  Promise.race([Promise.allSettled([sendBotAlert(msg)]), timeout]).finally(() => {
    onShutdown?.();
  });
}

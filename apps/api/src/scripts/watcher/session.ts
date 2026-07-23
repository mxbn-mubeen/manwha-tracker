import { sendBotAlert } from '../../utils/bot-alert';
import { SettingsRepository } from '../../modules/settings/settings.repository';

const settingsRepo = new SettingsRepository();

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
  console.error(
    '[watcher] No Telegram session found. Go to Settings → Telegram and paste a session string, ' +
    'or run `npm run login:telegram` to generate one.',
  );
  process.exit(1);
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
export function handleSessionDeath(marker: string) {
  if (sessionDeathAlertSent) return; // fire once, not on every subsequent call that hits the same dead session
  sessionDeathAlertSent = true;

  const msg =
    `🔴 <b>Watcher session dead (${marker})</b>\n\n` +
    `The session can no longer read any tracked channel.\n` +
    `Go to <b>Settings → Telegram</b> or run <code>npm run login:telegram</code> to generate a fresh session, then restart the watcher.`;

  console.error(
    `[watcher] WATCHER_ALERT Telegram session terminated (${marker}). It can no longer read any tracked channel. ` +
    'Generate a fresh session (Settings → Telegram, or `npm run login:telegram`) and restart the watcher. ' +
    'The process will now exit so your process manager doesn\'t spin retrying a session that cannot recover itself.',
  );
  console.error(`[watcher] FATAL: session dead (${marker}). Exiting.`);

  // Fire-and-forget: send the alert then exit. Use Promise.allSettled so we
  // don't hang forever if the Bot API is unreachable.
  const timeout = new Promise<void>((r) => setTimeout(r, 10_000));
  Promise.race([Promise.allSettled([sendBotAlert(msg)]), timeout]).finally(() => process.exit(1));
}

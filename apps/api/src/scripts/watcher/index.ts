/**
 * Telegram download-watcher
 * -------------------------
 * Long-running process (NOT part of the Express/tRPC server — run it as its
 * own PM2/systemd service, separate from `pnpm dev`).
 *
 * Design, per .agents/brain/decisions.md ("Telegram download = auto Last Read")
 * and .agents/brain/patterns.md ("Progress Auto-Update from Telegram"):
 *
 *   1. NewMessage on a tracked channel  -> catalogue the chapter (insert into
 *      `chapters`, idempotent). This alone does NOT touch progress.
 *   2. UpdateReadChannelInbox / UpdateReadHistoryInbox on a tracked channel
 *      -> the user's Telegram read-pointer moved (opened the app, opened the
 *      file, read it from their phone — GramJS/MTProto has no separate
 *      "file downloaded" event; the read-receipt is the closest real signal
 *      to "the user consumed this"). We resolve the newest message at-or-below
 *      the new read pointer, extract its chapter number, and mark it as last
 *      read — but only if it's actually newer than what's already recorded.
 *
 * IMPORTANT CAVEAT (read before relying on this):
 * MTProto's "read" update fires when ANY client logged into this account
 * reads the channel — including this watcher itself calling getMessages(),
 * which can mark things read as a side effect. We deliberately avoid calling
 * anything that marks messages read (no client.markAsRead / no auto-download)
 * so the only source of read-pointer movement is the user's own client(s).
 * This has not been run against a live Telegram session — verify against
 * your actual channels before trusting it unattended.
 */
import '../../env';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import { Raw } from 'telegram/events/Raw';
import { SettingsRepository } from '../../modules/settings/settings.repository';
import { setBotAlertChatId } from '../../utils/bot-alert';
import { resolveSession, handleSessionDeath, isSessionDeathError } from './session';
import { buildChannelMap, channelMap } from './channel-map';
import { handleNewMessage, handleReadUpdate } from './handlers';

const API_ID = Number(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH ?? '';

if (!API_ID || !API_HASH) {
  console.error('[watcher] Missing TELEGRAM_API_ID / TELEGRAM_API_HASH in env. Aborting.');
  process.exit(1);
}

const settingsRepo = new SettingsRepository();

export async function startWatcher() {
  const SESSION = await resolveSession();
  const client = new TelegramClient(new StringSession(SESSION), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  // Track intervals so we can clear them on graceful shutdown
  const intervals: ReturnType<typeof setInterval>[] = [];

  const shutdown = () => {
    for (const id of intervals) clearInterval(id);
    client.disconnect().catch(() => { /* best-effort */ });
    console.log('[watcher] Watcher stopped. API server keeps running.');
  };

  try {
    await client.connect();
  } catch (err) {
    const deathMarker = isSessionDeathError(err);
    if (deathMarker) {
      handleSessionDeath(deathMarker, shutdown);
      return;
    }
    throw err; // genuine connectivity issue (network, DC unreachable) — not a session death, let the caller's catch handle it
  }
  console.log('[watcher] Connected to Telegram.');

  // Warm the bot-alert chat ID from DB settings so session-death alerts can
  // be sent even if the bot service isn't running in this process.
  const alertChatId = await settingsRepo.get('telegram_alert_chat_id');
  if (alertChatId) {
    setBotAlertChatId(alertChatId);
    console.log('[watcher] Bot alert chat ID loaded from DB settings.');
  }

  await buildChannelMap(client);

  const me = await client.getMe().catch(() => null) as { username?: string; firstName?: string } | null;
  const identity = me ? (me.username ? `@${me.username}` : me.firstName ?? 'unknown') : 'unknown';
  console.log(
    `🚀 Telegram Watcher Started\n\n` +
    `📦 Sources Loaded : ${channelMap.size}\n` +
    `👤 Session        : ${identity}`,
  );

  // Re-map every 5 minutes so newly-added sources (via the web UI) get picked up
  // without restarting the process.
  intervals.push(setInterval(() => buildChannelMap(client).catch((e) => console.error('[watcher] remap failed:', e)), 5 * 60 * 1000));

  // Proactive session health check, independent of channel activity — a dead
  // session with no tracked channels posting anything would otherwise sit
  // silently until the next remap's getEntity call happens to fail.
  intervals.push(setInterval(async () => {
    try {
      await client.getMe();
    } catch (err) {
      const deathMarker = isSessionDeathError(err);
      if (deathMarker) handleSessionDeath(deathMarker, shutdown);
    }
  }, 5 * 60 * 1000));

  client.addEventHandler(handleNewMessage, new NewMessage({}));

  client.addEventHandler((update: Api.TypeUpdate) => {
    if (update instanceof Api.UpdateReadChannelInbox) {
      const chatId = update.channelId.toString();
      if (channelMap.has(chatId)) {
        // The rich, per-chapter log line is emitted inside handleReadUpdate
        // once it knows the manhwa/chapter — logging here too would just be noise.
        handleReadUpdate(client, chatId, update.maxId).catch((e) =>
          console.error('[watcher] handleReadUpdate error:', e),
        );
      }
    } else if (update instanceof Api.UpdateReadHistoryInbox) {
      const chatId = (update.peer as any)?.channelId?.toString() ?? (update.peer as any)?.chatId?.toString();
      if (chatId && channelMap.has(chatId)) {
        handleReadUpdate(client, chatId, update.maxId).catch((e) =>
          console.error('[watcher] handleReadUpdate error:', e),
        );
      }
    }
  }, new Raw({}));

  console.log('[watcher] Listening for new chapters and read-events on tracked channels...');
}

// If running as a standalone script (e.g. npm run watch:telegram)
if (require.main === module) {
  startWatcher().catch((err) => {
    console.error('[watcher] Fatal error:', err);
    process.exit(1);
  });

  process.on('SIGINT', () => {
    console.log('\n[watcher] Shutting down.');
    process.exit(0);
  });
}
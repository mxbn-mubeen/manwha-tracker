/**
 * Command and forward-message handlers.
 * Stateful (pendingChannels map) — import once and reuse across the poll loop.
 */
import { db, manhwa, sources } from '@manhwa-tracker/database';
import { eq, and } from 'drizzle-orm';
import { TelegramRepository } from '../../modules/telegram/telegram.repository';
import { SettingsRepository } from '../../modules/settings/settings.repository';
import { setBotAlertChatId } from '../../utils/bot-alert';
import { sendText, splitSafe } from './api';

export const repo = new TelegramRepository();
export const settingsRepo = new SettingsRepository();

// Pending forwarded channel per user chat_id: waiting for manhwa ID reply.
export type PendingChannel = {
  entityId: string;
  title: string;
  entityType: 'channel' | 'chat' | 'user';
};
export const pendingChannels = new Map<number, PendingChannel>();

// ── Message templates ─────────────────────────────────────────────────────────

export const WELCOME = `👋 Manhwa Tracker Alert Bot

Your chat ID has been saved — session-death and FloodWait alerts will be sent here.

Commands:
• /list — list active Telegram sources
• /help — show this message
• /cancel — cancel a pending channel registration

Adding a private channel:
1. Forward any message from the private channel to this bot.
2. The bot will extract the entity info and ask for the manhwa ID.
3. Reply with the manhwa ID number.
4. The watcher caches the access hash automatically on next remap (within 5 min) — no restart needed.`;

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function handleStart(chatId: number) {
  // Save the user's chat_id to DB settings so sendBotAlert() can find it.
  await settingsRepo.set('telegram_alert_chat_id', String(chatId));
  // Also update the in-process cache immediately.
  setBotAlertChatId(String(chatId));
  await sendText(chatId, WELCOME);
}

export async function handleHelp(chatId: number) {
  await sendText(chatId, WELCOME);
}

export async function handleCancel(chatId: number) {
  if (pendingChannels.has(chatId)) {
    pendingChannels.delete(chatId);
    await sendText(chatId, '❌ Pending channel registration cancelled.');
  } else {
    await sendText(chatId, 'Nothing pending to cancel.');
  }
}

export async function handleList(chatId: number) {
  const rows = await db
    .select({
      id: sources.id,
      url: sources.url,
      manhwaTitle: manhwa.title,
      telegramEntityId: sources.telegramEntityId,
      telegramEntityType: sources.telegramEntityType,
    })
    .from(sources)
    .innerJoin(manhwa, eq(manhwa.id, sources.manhwaId))
    .where(and(eq(sources.type, 'telegram'), eq(sources.isActive, true)))
    .orderBy(manhwa.title);

  if (rows.length === 0) {
    await sendText(chatId, '📭 No active Telegram sources in the database.');
    return;
  }

  const lines = rows.map((r) => {
    const cached = r.telegramEntityId ? `✅ cached (${r.telegramEntityId})` : '⏳ pending resolution';
    return `• ${r.manhwaTitle}\n  ${r.url}\n  ${cached}`;
  });

  const text = `📋 Active Telegram sources (${rows.length})\n\n${lines.join('\n\n')}`;

  // Telegram message limit is 4096 chars; split at line boundaries.
  for (const chunk of splitSafe(text, 3800)) {
    await sendText(chatId, chunk);
  }
}

/**
 * Called when the user forwards a message from a Telegram channel.
 * Bot API forward_origin exposes chat.id, chat.title, chat.type but NOT the
 * MTProto access_hash — the watcher resolves that via getDialogs().
 */
export async function handleForwardedChannel(
  chatId: number,
  entityId: string,
  title: string,
  entityType: 'channel' | 'chat' | 'user',
) {
  pendingChannels.set(chatId, { entityId, title, entityType });

  await sendText(
    chatId,
    `📨 Forwarded channel detected\n\n` +
    `Title: ${title}\n` +
    `Entity ID: ${entityId}\n` +
    `Type: ${entityType}\n\n` +
    `Reply with the manhwa ID number to link this channel as a source.\n` +
    `(Send /list to see IDs, or /cancel to abort.)`,
  );
}

/** User replied with a manhwa ID after forwarding a channel message. */
export async function handleManhwaIdReply(chatId: number, text: string): Promise<boolean> {
  const pending = pendingChannels.get(chatId);
  if (!pending) return false; // not in pending state

  const manhwaId = parseInt(text.trim(), 10);
  if (isNaN(manhwaId) || manhwaId <= 0) {
    await sendText(chatId, "That doesn't look like a valid manhwa ID. Send a positive integer, or /cancel.");
    return true;
  }

  // Verify the manhwa exists
  const [row] = await db.select({ id: manhwa.id, title: manhwa.title })
    .from(manhwa)
    .where(eq(manhwa.id, manhwaId))
    .limit(1);

  if (!row) {
    await sendText(chatId, `No manhwa with ID ${manhwaId} found. Check /list for valid IDs.`);
    return true;
  }

  const source = await repo.addTelegramSourceWithEntity(
    manhwaId,
    pending.entityId,
    pending.title,
    pending.entityType,
  );

  pendingChannels.delete(chatId);

  if (!source) {
    // A null source either means a collision or another issue.
    // We added collision check to addTelegramSourceWithEntity, which returns null if linked to a different manhwa.
    await sendText(
      chatId,
      `❌ Could not add source. This channel is likely already linked to a different manhwa.`
    );
    return true;
  }

  // To check if it was newly inserted vs just already existed on this exact same manhwa,
  // we would need more data from repo, but the repo returns the existing one if it's the same manhwa.
  // We can just say source added.
  await sendText(
    chatId,
    `✅ Source added for "${row.title}"!\n\n` +
    `Channel: ${pending.title} (${pending.entityId})\n\n` +
    `The watcher will resolve the access hash on next remap (within 5 min) — no restart needed.`,
  );

  return true;
}

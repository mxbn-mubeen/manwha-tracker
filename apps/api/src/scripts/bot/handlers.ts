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

// Pending conflict per user chat_id: the manhwa they picked already has a telegram
// source, waiting for a "replace" / "cancel" reply.
export type PendingConflict = {
  manhwaId: number;
  manhwaTitle: string;
  entityId: string;
  title: string;
  entityType: 'channel' | 'chat' | 'user';
  existingSourceId: number;
  existingChatId: string;
};
export const pendingConflicts = new Map<number, PendingConflict>();

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
  if (pendingConflicts.has(chatId)) {
    pendingConflicts.delete(chatId);
    await sendText(chatId, '❌ Kept the existing mapping. No changes made.');
  } else if (pendingChannels.has(chatId)) {
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
    `📥 Telegram Channel Detected\n\n` +
    `📚 Title    : ${title}\n` +
    `🆔 Chat ID  : ${entityId}\n` +
    `📡 Type     : ${entityType}\n\n` +
    `Reply with the Manhwa ID to link this source.\n` +
    `(Send /list to see IDs, or /cancel to abort.)\n\n` +
    `Example:\n577`,
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

  // This manhwa already has a telegram source (possibly pointing at a different
  // chat) — don't silently overwrite or silently no-op it. Ask the user.
  const existingForManhwa = await repo.findTelegramSourceByManhwaId(manhwaId);
  if (existingForManhwa) {
    pendingChannels.delete(chatId);
    pendingConflicts.set(chatId, {
      manhwaId,
      manhwaTitle: row.title,
      entityId: pending.entityId,
      title: pending.title,
      entityType: pending.entityType,
      existingSourceId: existingForManhwa.id,
      existingChatId: existingForManhwa.telegramEntityId ?? 'unknown',
    });

    await sendText(
      chatId,
      `⚠️ Source Already Exists\n\n` +
      `📚 Manhwa  : ${row.title}\n` +
      `🆔 ID      : ${manhwaId}\n` +
      `📡 Chat ID : ${existingForManhwa.telegramEntityId ?? 'unknown'}\n\n` +
      `Reply:\n` +
      `• /replace → Update the existing Chat ID\n` +
      `• /cancel  → Keep the current mapping`,
    );
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
    // Collision: this exact Telegram entity is already linked to a *different* manhwa.
    await sendText(
      chatId,
      `❌ Could not add source. This channel is already linked to a different manhwa.`
    );
    return true;
  }

  await sendText(
    chatId,
    `✅ Source Linked\n\n` +
    `📚 Manhwa : ${row.title}\n` +
    `🆔 ID      : ${manhwaId}\n` +
    `📡 Chat ID : ${pending.entityId}\n\n` +
    `⏳ The watcher will refresh within ~5 minutes.`,
  );

  return true;
}

/**
 * User replied "replace" / "cancel" while a conflict (manhwa already has a
 * telegram source) is pending. Returns false if there's nothing pending,
 * so the caller can fall through to other handlers.
 */
export async function handleConflictReply(chatId: number, text: string): Promise<boolean> {
  const conflict = pendingConflicts.get(chatId);
  if (!conflict) return false;

  const reply = text.trim().toLowerCase();

  if (reply === 'cancel' || reply === '/cancel') {
    pendingConflicts.delete(chatId);
    await sendText(chatId, '❌ Kept the existing mapping. No changes made.');
    return true;
  }

  if (reply === 'replace' || reply === '/replace') {
    const updated = await repo.updateTelegramSourceEntity(
      conflict.existingSourceId,
      conflict.entityId,
      conflict.entityType,
    );
    pendingConflicts.delete(chatId);

    if (!updated) {
      await sendText(chatId, '❌ Could not update the source. Please try again.');
      return true;
    }

    await sendText(
      chatId,
      `🔄 Source Updated\n\n` +
      `Old Chat ID : ${conflict.existingChatId}\n` +
      `New Chat ID : ${conflict.entityId}\n\n` +
      `✅ The watcher will use the new Chat ID after the next refresh.`,
    );
    return true;
  }

  await sendText(chatId, 'Reply /replace to update the Chat ID, or /cancel to keep the current mapping.');
  return true;
}
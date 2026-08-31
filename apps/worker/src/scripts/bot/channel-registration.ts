/**
 * Handlers for the multi-step channel registration flow:
 *   1. User forwards a Telegram channel message → handleForwardedChannel
 *   2. User replies with a manhwa ID → handleManhwaIdReply
 *   3. If a conflict exists, user replies "replace"/"cancel" → handleConflictReply
 */
import { db, manhwa, sources } from '@manhwa-tracker/database';
import { eq } from 'drizzle-orm';
import { TelegramRepository } from '../../modules/telegram/telegram.repository';
import { sendText } from './api';

const repo = new TelegramRepository();

// ── Pending state maps ────────────────────────────────────────────────────────

export type PendingChannel = {
  entityId: string;
  title: string;
  entityType: 'channel' | 'chat' | 'user';
};
export const pendingChannels = new Map<number, PendingChannel>();

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

// ── Handlers ──────────────────────────────────────────────────────────────────

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
  if (!pending) return false;

  const manhwaId = parseInt(text.trim(), 10);
  if (isNaN(manhwaId) || manhwaId <= 0) {
    await sendText(chatId, "That doesn't look like a valid manhwa ID. Send a positive integer, or /cancel.");
    return true;
  }

  const [row] = await db.select({ id: manhwa.id, title: manhwa.title })
    .from(manhwa)
    .where(eq(manhwa.id, manhwaId))
    .limit(1);

  if (!row) {
    await sendText(chatId, `No manhwa with ID ${manhwaId} found. Check /list for valid IDs.`);
    return true;
  }

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
    await sendText(chatId, `❌ Could not add source. This channel is already linked to a different manhwa.`);
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
 * User replied "replace" / "cancel" while a conflict is pending.
 * Returns false if nothing is pending, so the caller can fall through.
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

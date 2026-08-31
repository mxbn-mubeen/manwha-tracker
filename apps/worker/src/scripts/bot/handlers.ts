/**
 * Simple command handlers for the Telegram bot.
 * Stateful pending maps live in channel-registration.ts.
 */
import { db, manhwa, sources } from '@manhwa-tracker/database';
import { eq, and } from 'drizzle-orm';
import { SettingsRepository } from '@manhwa-tracker/database';
import { ManhwaService } from '../../modules/manhwa/manhwa.service';
import { setBotAlertChatId } from '../../utils/bot-alert';
import { sendText, splitSafe } from './api';

export { pendingChannels, pendingConflicts } from './channel-registration';
export type { PendingChannel, PendingConflict } from './channel-registration';
export { handleForwardedChannel, handleManhwaIdReply, handleConflictReply } from './channel-registration';

export const settingsRepo = new SettingsRepository();
export const manhwaService = new ManhwaService();

// ── Message templates ─────────────────────────────────────────────────────────

export const WELCOME = `👋 Manhwa Tracker Alert Bot

Your chat ID has been saved — session-death and FloodWait alerts will be sent here.

Commands:
• /create <Title> — create a new manhwa
• /latest <id> <chapter> — set latest chapter
• /read <id> <chapter> — set last read chapter
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
  await settingsRepo.set('telegram_alert_chat_id', String(chatId));
  setBotAlertChatId(String(chatId));
  await sendText(chatId, WELCOME);
}

export async function handleHelp(chatId: number) {
  await sendText(chatId, WELCOME);
}

export async function handleCancel(chatId: number) {
  const { pendingConflicts, pendingChannels } = await import('./channel-registration');
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
  for (const chunk of splitSafe(text, 3800)) {
    await sendText(chatId, chunk);
  }
}

export async function handleCreateCommand(chatId: number, text: string) {
  const title = text.replace(/^\/create\s*/i, '').trim();
  if (!title) {
    await sendText(chatId, '❌ Please provide a title. Example: /create Solo Leveling');
    return;
  }
  try {
    const created = await manhwaService.create({ title });
    await sendText(chatId, `✅ Created Manhwa '${created.title}'\n🆔 ID: ${created.id}\n\nYou can now forward a channel message and reply with this ID to link it.`);
  } catch (err) {
    console.error('[bot] handleCreate error:', err);
    await sendText(chatId, '❌ Failed to create manhwa.');
  }
}

export async function handleLatestCommand(chatId: number, text: string) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 3) {
    await sendText(chatId, '❌ Usage: /latest <manhwaId> <chapterNumber>');
    return;
  }
  const manhwaId = parseInt(parts[1]!, 10);
  const chapterNum = parseFloat(parts[2]!);
  if (isNaN(manhwaId) || isNaN(chapterNum)) {
    await sendText(chatId, '❌ Invalid ID or chapter number.');
    return;
  }
  try {
    await manhwaService.setLatestChapter(manhwaId, chapterNum);
    await sendText(chatId, `✅ Latest chapter set to ${chapterNum} for Manhwa ID ${manhwaId}.`);
  } catch (err) {
    console.error('[bot] handleLatest error:', err);
    await sendText(chatId, '❌ Failed to set latest chapter.');
  }
}

export async function handleReadCommand(chatId: number, text: string) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 3) {
    await sendText(chatId, '❌ Usage: /read <manhwaId> <chapterNumber>');
    return;
  }
  const manhwaId = parseInt(parts[1]!, 10);
  const chapterNum = parseFloat(parts[2]!);
  if (isNaN(manhwaId) || isNaN(chapterNum)) {
    await sendText(chatId, '❌ Invalid ID or chapter number.');
    return;
  }
  try {
    await manhwaService.updateProgress(manhwaId, chapterNum);
    await sendText(chatId, `✅ Last read chapter set to ${chapterNum} for Manhwa ID ${manhwaId}.`);
  } catch (err) {
    console.error('[bot] handleRead error:', err);
    await sendText(chatId, '❌ Failed to set last read chapter.');
  }
}

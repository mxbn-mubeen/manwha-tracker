import { apiCall, sendText, sleep } from './api';
import {
  handleStart,
  handleHelp,
  handleCancel,
  handleList,
  handleForwardedChannel,
  handleManhwaIdReply,
  handleConflictReply,
  handleCreateCommand,
  handleLatestCommand,
  handleReadCommand,
  settingsRepo,
} from './handlers';
import { setBotAlertChatId } from '../../utils/bot-alert';

// ── Update dispatcher ─────────────────────────────────────────────────────────

async function handleUpdate(update: any) {
  const msg = update.message;
  if (!msg) return;

  const chatId: number = msg.chat.id;
  const text: string = msg.text ?? '';

  // Fail closed: if ALLOWED_CHAT_ID isn't configured, ignore everyone rather
  // than silently accepting commands from any Telegram user who DMs the bot.
  const allowedChatId = process.env.ALLOWED_CHAT_ID;
  if (!allowedChatId || String(chatId) !== allowedChatId) {
    console.warn(`[bot] Ignored message from unauthorized chat ${chatId}`);
    return;
  }

  // Commands
  if (text.startsWith('/start')) { await handleStart(chatId); return; }
  if (text.startsWith('/help')) { await handleHelp(chatId); return; }
  if (text.startsWith('/cancel')) { await handleCancel(chatId); return; }
  if (text.startsWith('/list')) { await handleList(chatId); return; }
  if (text.startsWith('/create')) { await handleCreateCommand(chatId, text); return; }
  if (text.startsWith('/latest')) { await handleLatestCommand(chatId, text); return; }
  if (text.startsWith('/read')) { await handleReadCommand(chatId, text); return; }
  if (text.startsWith('/replace')) {
    const handled = await handleConflictReply(chatId, text);
    if (!handled) await sendText(chatId, 'Nothing pending to replace.');
    return;
  }

  // Forwarded channel message
  const fwdOrigin = msg.forward_origin;
  if (fwdOrigin) {
    if (fwdOrigin.type === 'channel' && fwdOrigin.chat) {
      const chat = fwdOrigin.chat;
      // Bot API encodes channel/supergroup IDs as -100{mtproto_id}.
      // Math.abs() gives 100{mtproto_id} — we must remove the 100-prefix by
      // subtracting 1e12 so the stored ID matches what GramJS reports in
      // UpdateReadChannelInbox.channelId (the raw MTProto ID, no prefix).
      // Regular groups keep their plain absolute value.
      const absId = Math.abs(chat.id);
      const entityId = (chat.type === 'channel' || chat.type === 'supergroup')
        ? String(absId - 1_000_000_000_000)
        : String(absId);
      const title: string = chat.title ?? chat.username ?? 'Unknown';
      const entityType: 'channel' | 'chat' | 'user' =
        chat.type === 'channel' ? 'channel' :
          chat.type === 'supergroup' || chat.type === 'group' ? 'chat' : 'channel';
      await handleForwardedChannel(chatId, entityId, title, entityType);
      return;
    }

    if (fwdOrigin.type === 'hidden_user') {
      await sendText(chatId,
        'The forward source is hidden (privacy settings). ' +
        'The channel entity info cannot be extracted from this message.',
      );
      return;
    }

    // User/other forward — not a channel
    await sendText(chatId,
      "This doesn't look like a channel forward. Forward a message from the private channel you want to track.",
    );
    return;
  }

  // Text reply — check if we're waiting for a replace/cancel decision, then a manhwa ID
  if (text && !text.startsWith('/')) {
    const conflictHandled = await handleConflictReply(chatId, text);
    if (conflictHandled) return;

    const handled = await handleManhwaIdReply(chatId, text);
    if (!handled) {
      await sendText(chatId,
        'Send /help for a list of commands, or forward a message from a private channel to register it.',
      );
    }
    return;
  }
}

// ── Long-polling loop ─────────────────────────────────────────────────────────

export async function poll() {
  let offset = 0;

  // On startup, read alert chat_id from DB and warm the in-memory cache.
  const savedChatId = await settingsRepo.get('telegram_alert_chat_id');
  if (savedChatId) {
    setBotAlertChatId(savedChatId);
    console.log(`[bot] Alert chat_id loaded from DB: ${savedChatId}`);
  } else {
    console.log('[bot] No alert chat_id in DB yet — send /start to the bot to register.');
  }

  const me = await apiCall<any>('getMe');
  console.log(`[bot] Connected as @${me.username} (${me.first_name})`);
  console.log('[bot] Polling for updates...');

  for (; ;) {
    let updates: any[] = [];
    try {
      updates = await apiCall<any[]>('getUpdates', {
        offset,
        timeout: 30,
        allowed_updates: ['message'],
      });
    } catch (err) {
      console.error('[bot] getUpdates error:', err instanceof Error ? err.message : String(err));
      await sleep(5000);
      continue;
    }

    for (const update of updates) {
      offset = update.update_id + 1;
      try {
        await handleUpdate(update);
      } catch (err) {
        console.error('[bot] handleUpdate error:', err instanceof Error ? err.message : String(err));
      }
    }
  }
}
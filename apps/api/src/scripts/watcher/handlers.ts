import { Api, TelegramClient } from 'telegram';
import { type NewMessageEvent } from 'telegram/events';
import bigInt from 'big-integer';
import { extractChapterNumber } from '@manhwa-tracker/parser';
import { repo, channelMap, type ChannelMapEntry } from './channel-map';
import { isSessionDeathError, handleSessionDeath } from './session';

/**
 * Build the exact InputPeer gramJS needs for client.getMessages().
 *
 * Root cause of "Could not find the input entity for ... PeerUser": handleReadUpdate
 * used to pass the bare numeric chatId (a string) straight to client.getMessages().
 * gramJS can only resolve a bare ID through its *local* entity cache; if this process
 * hasn't independently "seen" that entity this session (e.g. right after a fresh
 * login, or a channel that never triggered NewMessage), the cache lookup misses and
 * gramJS's fallback guesses PeerUser — which fails for anything that's actually a
 * channel or chat, exactly as seen in the logs.
 *
 * We already persist each source's accessHash + entity type in Postgres precisely so
 * we don't depend on gramJS's session-local cache. Building the InputPeer explicitly
 * from that stored data sidesteps the guesswork entirely.
 */
export function buildInputPeer(chatId: string, mapped: ChannelMapEntry): Api.TypeInputPeer | null {
  if (mapped.entityType === 'chat') {
    // Basic (non-super) group chats don't use an accessHash.
    return new Api.InputPeerChat({ chatId: bigInt(chatId) });
  }
  if (!mapped.accessHash) return null;
  const id = bigInt(chatId);
  const hash = bigInt(mapped.accessHash);
  if (mapped.entityType === 'user') {
    return new Api.InputPeerUser({ userId: id, accessHash: hash });
  }
  // Default to channel — UpdateReadChannelInbox is always a channel, and it's the
  // overwhelmingly common case for UpdateReadHistoryInbox too.
  return new Api.InputPeerChannel({ channelId: id, accessHash: hash });
}

export function extractFallbackChapter(text: string): number | null {
  const cleaned = text
    .replace(/\b(19\d\d|20\d\d)\b/g, '') // remove years
    .replace(/\b(720|1080|1440|2160|480|360)[pi]?\b/gi, '') // remove resolutions
    .replace(/\b\d+(?:kb|mb|gb)\b/gi, '') // remove sizes
    .replace(/\b(66666|10000|4000|100|99|1st|2nd|3rd|\d+th)\b/gi, ''); // remove common title numbers

  const matches = cleaned.match(/(?:^|\b|_|-|#)(\d+(?:\.\d+)?)(?:\b|_|-|\.|$)/g);
  if (!matches) return null;

  const lastMatch = matches[matches.length - 1];
  if (!lastMatch) return null;
  const numMatch = lastMatch.match(/\d+(?:\.\d+)?/);
  if (!numMatch) return null;

  const num = parseFloat(numMatch[0]);
  return Number.isNaN(num) ? null : num;
}

/** Best-effort chapter number extraction from a Telegram message: caption text, then filename. */
export function extractChapterFromMessage(message: Api.Message): number | null {
  if (message.message) {
    const fromCaption = extractChapterNumber(message.message);
    if (fromCaption !== null) return fromCaption;
  }
  const doc = message.media && 'document' in message.media ? (message.media as any).document : null;
  const filenameAttr = doc?.attributes?.find((a: any) => a.fileName)?.fileName as string | undefined;
  if (filenameAttr) {
    const fromFilename = extractChapterNumber(filenameAttr);
    if (fromFilename !== null) return fromFilename;
  }

  // Telegram-specific fallback: look for numbers that look like chapters in the text
  // Many channels post things like "Murim Psycho 82" or "082.cbz" without the word "Chapter"
  // BUT only apply this aggressive fallback if the message actually has a file (document) attached,
  // or if it has a photo + link. If it's a pure text/photo ad without a file, aggressive fallback
  // will parse random numbers like "18+" into chapter 18.
  if (doc) {
    if (message.message) {
      const fallback = extractFallbackChapter(message.message);
      if (fallback !== null) return fallback;
    }
    if (filenameAttr) {
      const fallback = extractFallbackChapter(filenameAttr);
      if (fallback !== null) return fallback;
    }
  }

  return null;
}

/** Step 1: catalogue new chapters as they're posted (does not touch progress). */
export async function handleNewMessage(event: NewMessageEvent) {
  const message = event.message;
  const chatId = message.chatId?.toString();
  if (!chatId) return;

  const mapped = channelMap.get(chatId);
  if (!mapped) return; // not a tracked channel

  const chapterNum = extractChapterFromMessage(message);
  if (chapterNum === null) return;

  const inserted = await repo.insertChapter({
    manhwaId: mapped.manhwaId,
    sourceId: mapped.sourceId,
    chapterNum,
    title: message.message || `Chapter ${chapterNum}`,
    url: null, // Telegram messages don't have a stable public URL for private channels
    publishedAt: message.date ? new Date(message.date * 1000) : null,
  });

  if (inserted) {
    await repo.touchManhwaUpdatedAt(mapped.manhwaId);
    console.log(`[watcher] New chapter catalogued: ${mapped.manhwaTitle} #${chapterNum}`);
  }
}

/** Step 2: the user's read-pointer moved in a tracked channel -> advance progress. */
export async function handleReadUpdate(client: TelegramClient, chatId: string, maxId: number) {
  const mapped = channelMap.get(chatId);
  if (!mapped) return;

  try {
    const inputPeer = buildInputPeer(chatId, mapped);
    if (!inputPeer) {
      // Known channel, but we don't have its accessHash yet (e.g. added via the bot
      // and dialogs scan hasn't found it). It'll self-heal once resolveAccessHashViaDialogs
      // picks it up on a later remap — nothing to do here but wait.
      console.warn(`[watcher] Skipping read-update for ${mapped.manhwaTitle}: no accessHash cached yet for entity ${chatId}.`);
      return;
    }

    // Fetch the message at the new read pointer (and a small window before it,
    // in case several messages were read at once) to find the highest chapter number.
    const messages = await client.getMessages(inputPeer, { maxId: maxId + 1, limit: 10 });

    let chapterNum: number | null = null;
    let targetMessage: Api.Message | null = null;

    for (const msg of messages) {
      const num = extractChapterFromMessage(msg as Api.Message);
      if (num !== null) {
        chapterNum = num;
        targetMessage = msg as Api.Message;
        break;
      }
    }

    if (chapterNum === null || !targetMessage) return;

    let chapterRow = await repo.findChapter(mapped.manhwaId, chapterNum);
    if (!chapterRow) {
      // Catalogue it if NewMessage somehow missed it (e.g. watcher was offline when it was posted)
      chapterRow = await repo.insertChapter({
        manhwaId: mapped.manhwaId,
        sourceId: mapped.sourceId,
        chapterNum,
        title: targetMessage.message || `Chapter ${chapterNum}`,
        url: null,
        publishedAt: targetMessage.date ? new Date(targetMessage.date * 1000) : null,
      });
    }
    if (!chapterRow) return;

    const advanced = await repo.markAsReadIfNewer(mapped.manhwaId, chapterRow.id, chapterNum);
    if (advanced) {
      console.log(`[watcher] Progress advanced: ${mapped.manhwaTitle} -> last read #${chapterNum}`);
    }
  } catch (err) {
    const deathMarker = isSessionDeathError(err);
    if (deathMarker) {
      handleSessionDeath(deathMarker);
      return;
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[watcher] Failed to process read-update for ${mapped.manhwaTitle}: ${message}`);
  }
}

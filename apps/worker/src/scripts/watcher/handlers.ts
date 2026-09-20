import { Api, TelegramClient } from 'teleproto';
import { type NewMessageEvent } from 'teleproto/events';
import bigInt from 'big-integer';
import { extractChapterNumber } from '@manhwa-tracker/parser';
import { repo, channelMap, type ChannelMapEntry } from './channel-map';
import { isSessionDeathError, handleSessionDeath } from './session';
import { extractFallbackChapter, stripKnownTitleNumbers } from './fallback-extractor';

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


/**
 * Every tracked channel posts chapters exclusively as .pdf (confirmed, not
 * assumed) — so requiring a .pdf attachment before extracting anything at
 * all is a safe, hard gate here, not a risky one. It rules out an entire
 * category of false positives in one place: promotional text posts, cover
 * images, non-chapter documents, and channel-info messages can no longer
 * produce a chapter number no matter what digits happen to appear in them.
 */
function getPdfFilename(message: Api.Message): string | undefined {
  const doc = message.media && 'document' in message.media ? (message.media as any).document : null;
  const filenameAttr = doc?.attributes?.find((a: any) => a.fileName)?.fileName as string | undefined;
  return filenameAttr?.toLowerCase().endsWith('.pdf') ? filenameAttr : undefined;
}

/** Best-effort chapter number extraction from a Telegram message: caption text, then filename. */
export function extractChapterFromMessage(message: Api.Message, manhwaTitle?: string): number | null {
  const filenameAttr = getPdfFilename(message);
  if (!filenameAttr) return null; // no .pdf attached — never guess from caption/text alone

  const fromFilename = extractChapterNumber(filenameAttr);
  if (fromFilename !== null) return fromFilename;

  if (message.message) {
    const fromCaption = extractChapterNumber(message.message);
    if (fromCaption !== null) return fromCaption;
  }

  // Telegram-specific fallback: look for numbers that look like chapters in the text
  // Many channels post things like "Murim Psycho 82" without the word "Chapter".
  // Safe to always attempt here — reaching this point already guarantees a
  // .pdf is attached (gated above), so this can't misfire on a pure text/photo ad.
  {
    if (message.message) {
      const fallback = extractFallbackChapter(stripKnownTitleNumbers(message.message, manhwaTitle));
      if (fallback !== null) return fallback;
    }
    if (filenameAttr) {
      const fallback = extractFallbackChapter(stripKnownTitleNumbers(filenameAttr, manhwaTitle));
      if (fallback !== null) return fallback;
    }
  }

  return null;
}

/**
 * Catalogue a single Telegram message as a chapter, if it looks like one.
 * Idempotent via insertChapter's onConflictDoNothing — safe to call for a
 * message that's already been seen (e.g. from both the live NewMessage event
 * and a later reconciliation scan covering the same window).
 * Shared by handleNewMessage (live) and the reconciliation scan (backfill).
 */
export async function catalogueMessage(
  mapped: ChannelMapEntry,
  chatId: string,
  message: Api.Message,
): Promise<{ chapterNum: number; saved: boolean } | null> {
  const chapterNum = extractChapterFromMessage(message, mapped.manhwaTitle);
  if (chapterNum === null) return null;

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
    console.log(`📨 ${mapped.manhwaTitle} | Ch.${chapterNum} | chat=${chatId} | msg=${message.id} | 💾 Saved`);
  }

  return { chapterNum, saved: !!inserted };
}

/** Step 1: catalogue new chapters as they're posted (does not touch progress). */
export async function handleNewMessage(event: NewMessageEvent) {
  const message = event.message;
  const chatId = message.chatId?.toString();
  if (!chatId) return;

  const entries = channelMap.get(chatId);
  if (!entries || entries.length === 0) return; // not a tracked channel

  for (const mapped of entries) {
    try {
      await catalogueMessage(mapped, chatId, message);
    } catch (err) {
      console.error(
        `[watcher] catalogueMessage failed for ${mapped.manhwaTitle} (chat=${chatId}, msg=${message.id}):`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

/** Step 2: the user's read-pointer moved in a tracked channel -> advance progress. */
export async function handleReadUpdate(client: TelegramClient, chatId: string, maxId: number) {
  const entries = channelMap.get(chatId);
  if (!entries || entries.length === 0) return;

  // Use first entry's accessHash/entityType to build the peer (they share the same channel)
  const firstEntry = entries[0];
  if (!firstEntry) return; // shouldn't happen if entries.length > 0 check above passed

  let messages: Api.Message[];
  try {
    const inputPeer = buildInputPeer(chatId, firstEntry);
    if (!inputPeer) {
      console.warn(`[watcher] Skipping read-update for chat ${chatId}: no accessHash cached yet.`);
      return;
    }
    messages = await client.getMessages(inputPeer, { maxId: maxId + 1, limit: 10 }) as Api.Message[];
  } catch (err) {
    const deathMarker = isSessionDeathError(err);
    if (deathMarker) { handleSessionDeath(deathMarker); return; }
    console.error(`[watcher] Failed to fetch messages for read-update (chat=${chatId}):`, err instanceof Error ? err.message : String(err));
    return;
  }

  // For each manhwa mapped to this channel, find the highest chapter in the fetched window.
  for (const mapped of entries) {
    try {
      let chapterNum: number | null = null;
      let targetMessage: Api.Message | null = null;

      for (const msg of messages) {
        const num = extractChapterFromMessage(msg as Api.Message, mapped.manhwaTitle);
        if (num !== null) {
          chapterNum = num;
          targetMessage = msg as Api.Message;
          break;
        }
      }

      if (chapterNum === null || !targetMessage) {
        console.log(`📖 ${mapped.manhwaTitle} | chat=${chatId} | msg≤${maxId} | ⚠️ No chapter number found, progress unchanged`);
        continue;
      }

      let chapterRow = await repo.findChapter(mapped.manhwaId, chapterNum);
      if (!chapterRow) {
        chapterRow = await repo.insertChapter({
          manhwaId: mapped.manhwaId,
          sourceId: mapped.sourceId,
          chapterNum,
          title: targetMessage.message || `Chapter ${chapterNum}`,
          url: null,
          publishedAt: targetMessage.date ? new Date(targetMessage.date * 1000) : null,
        });
      }
      if (!chapterRow) continue;

      const advanced = await repo.markAsReadIfNewer(mapped.manhwaId, chapterRow.id, chapterNum);
      console.log(
        `📖 ${mapped.manhwaTitle} | Ch.${chapterNum} | chat=${chatId} | msg=${targetMessage.id} | ` +
        (advanced ? '✅ Matched' : '⏭️ Not newer, skipped'),
      );
    } catch (err) {
      const deathMarker = isSessionDeathError(err);
      if (deathMarker) { handleSessionDeath(deathMarker); return; }
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[watcher] Failed to process read-update for ${mapped.manhwaTitle}: ${message}`);
    }
  }
}

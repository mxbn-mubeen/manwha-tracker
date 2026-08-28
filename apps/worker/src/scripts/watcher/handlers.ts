import { Api, TelegramClient } from 'teleproto';
import { type NewMessageEvent } from 'teleproto/events';
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

/**
 * Some shows have a number baked into their own title/aliases (e.g. this
 * app tracks one literally titled "...3077" across every alias — not a
 * chapter count, just part of the name, the same way "86 Eighty-Six" or
 * "9-1-1" have numbers with nothing to do with episode counts). If an
 * uploader names their file after the show itself, the fallback matcher
 * below has no way to tell "a number from the title" apart from "the
 * actual chapter" — so strip any 2+-digit run that's part of the known
 * title before guessing. (2+ digits only, so a real single-digit early
 * chapter like "5" can't be accidentally swallowed by an incidental digit
 * somewhere in the title.)
 */
function stripKnownTitleNumbers(text: string, title: string | undefined): string {
  if (!title) return text;
  const titleNumbers = title.match(/\d{2,}/g);
  if (!titleNumbers) return text;
  let result = text;
  for (const n of new Set(titleNumbers)) {
    // \b alone doesn't work here — underscore counts as a word character in
    // JS regex, so "_3077_" has no \b between "_" and "3". Match the same
    // set of delimiters extractFallbackChapter itself treats as boundaries.
    result = result.replace(new RegExp(`(?:^|\\b|_|-|#)${n}(?:\\b|_|-|\\.|$)`, 'g'), ' ');
  }
  return result;
}

export function extractFallbackChapter(text: string): number | null {
  const cleaned = text
    .replace(/\b(19\d\d|20\d\d)\b/g, '') // remove years
    .replace(/\b(720|1080|1440|2160|480|360)[pi]?\b/gi, '') // remove resolutions
    .replace(/\b\d+(?:\.\d+)?\s*(?:kb|mb|gb)\b/gi, '') // remove sizes (Telegram's own captions use "4074 KB", with a space)
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

  const mapped = channelMap.get(chatId);
  if (!mapped) return; // not a tracked channel

  // Unlike handleReadUpdate's call sites (which are always wrapped in
  // .catch() by the caller), this function is registered directly as a
  // GramJS event handler with no wrapper around it. A single failed DB
  // write here (Neon hiccup, pool exhaustion, etc.) becomes an unhandled
  // promise rejection, and Node's default since v15 is to crash the whole
  // process on that — taking the Express server, bot poller, and every
  // other tracked channel down with it over one bad message. Catch and log
  // instead so a transient failure on one message can't kill the watcher.
  try {
    await catalogueMessage(mapped, chatId, message);
  } catch (err) {
    console.error(
      `[watcher] catalogueMessage failed for ${mapped.manhwaTitle} (chat=${chatId}, msg=${message.id}):`,
      err instanceof Error ? err.message : String(err),
    );
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
      const num = extractChapterFromMessage(msg as Api.Message, mapped.manhwaTitle);
      if (num !== null) {
        chapterNum = num;
        targetMessage = msg as Api.Message;
        break;
      }
    }

    if (chapterNum === null || !targetMessage) {
      console.log(`📖 ${mapped.manhwaTitle} | chat=${chatId} | msg≤${maxId} | ⚠️ No chapter number found, progress unchanged`);
      return;
    }

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

    // Structured, single-line log — easy to grep/scan in Railway/Vercel logs.
    console.log(
      `📖 ${mapped.manhwaTitle} | Ch.${chapterNum} | chat=${chatId} | msg=${targetMessage.id} | ` +
      (advanced ? '✅ Matched' : '⏭️ Not newer, skipped'),
    );
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

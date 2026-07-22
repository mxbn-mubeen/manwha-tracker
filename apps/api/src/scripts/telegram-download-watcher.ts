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
import '../env';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, type NewMessageEvent } from 'telegram/events';
import { Raw } from 'telegram/events/Raw';
import { extractChapterNumber } from '@manhwa-tracker/parser';
import { TelegramRepository } from '../modules/telegram/telegram.repository';
import { SettingsRepository } from '../modules/settings/settings.repository';

const API_ID = Number(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH ?? '';

if (!API_ID || !API_HASH) {
  console.error('[watcher] Missing TELEGRAM_API_ID / TELEGRAM_API_HASH in env. Aborting.');
  process.exit(1);
}

const repo = new TelegramRepository();
const settingsRepo = new SettingsRepository();

/** Resolve session: DB wins, fallback to TELEGRAM_SESSION env. */
async function resolveSession(): Promise<string> {
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

// entity id (channel/chat id, as a string) -> { manhwaId, sourceId, manhwaTitle }
type ChannelMapEntry = { manhwaId: number; sourceId: number; manhwaTitle: string };
const channelMap = new Map<string, ChannelMapEntry>();

async function buildChannelMap(client: TelegramClient) {
  channelMap.clear();
  const telegramSources = await repo.getActiveTelegramSources();

  if (telegramSources.length === 0) {
    console.warn(
      '[watcher] No active telegram sources found. Add one via the "Add Source" ' +
        'form on a manhwa detail page (type = telegram, url = channel @username or invite link) ' +
        'before running this watcher.',
    );
    return;
  }

  for (const source of telegramSources) {
    try {
      const entity = await client.getEntity(source.url);
      const id = entity.id.toString();
      channelMap.set(id, {
        manhwaId: source.manhwaId,
        sourceId: source.sourceId,
        manhwaTitle: source.manhwaTitle,
      });
      console.log(`[watcher] Mapped channel "${source.url}" (id=${id}) -> ${source.manhwaTitle}`);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[watcher] Could not resolve entity for source url "${source.url}": ${message}`);
    }
  }
}

function extractFallbackChapter(text: string): number | null {
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
function extractChapterFromMessage(message: Api.Message): number | null {
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
async function handleNewMessage(event: NewMessageEvent) {
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
async function handleReadUpdate(client: TelegramClient, chatId: string, maxId: number) {
  const mapped = channelMap.get(chatId);
  if (!mapped) return;

  try {
    // Fetch the message at the new read pointer (and a small window before it,
    // in case several messages were read at once) to find the highest chapter number.
    const messages = await client.getMessages(chatId, { maxId: maxId + 1, limit: 10 });
    
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
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[watcher] Failed to process read-update for ${mapped.manhwaTitle}: ${message}`);
  }
}

export async function startWatcher() {
  const SESSION = await resolveSession();
  const client = new TelegramClient(new StringSession(SESSION), API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('[watcher] Connected to Telegram.');

  await buildChannelMap(client);
  // Re-map every 5 minutes so newly-added sources (via the web UI) get picked up
  // without restarting the process.
  setInterval(() => buildChannelMap(client).catch((e) => console.error('[watcher] remap failed:', e)), 5 * 60 * 1000);

  client.addEventHandler(handleNewMessage, new NewMessage({}));

  client.addEventHandler((update: Api.TypeUpdate) => {
    if (update instanceof Api.UpdateReadChannelInbox) {
      handleReadUpdate(client, update.channelId.toString(), update.maxId).catch((e) =>
        console.error('[watcher] handleReadUpdate error:', e),
      );
    } else if (update instanceof Api.UpdateReadHistoryInbox) {
      const chatId = (update.peer as any)?.channelId?.toString() ?? (update.peer as any)?.chatId?.toString();
      if (chatId) {
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

/**
 * Periodic reconciliation scan.
 * -----------------------------
 * Live events (NewMessage / UpdateReadChannelInbox) are the primary path.
 * catchUp:true backfills whatever they miss across a reconnect. This is the
 * second, independent safety net underneath both: on a fixed interval, for
 * every tracked channel, pull the last N messages directly and diff them
 * against the DB, and pull the current read-inbox pointer directly and
 * re-apply it. It doesn't depend on the event stream at all, so it also
 * catches things live events can't — a logic bug in the event handlers, a
 * process crash between events, a Telegram-side update that never got sent.
 *
 * Cheap and safe to run repeatedly: insertChapter no-ops on conflict,
 * markAsReadIfNewer only ever advances progress forward.
 */
import { Api, TelegramClient } from "telegram";
import { channelMap, type ChannelMapEntry } from "./channel-map";
import { buildInputPeer, catalogueMessage } from "./handlers";
import { repo } from "./channel-map";
import { isSessionDeathError, handleSessionDeath } from "./session";

const MESSAGES_PER_CHANNEL = 20; // how far back to look per channel each scan
const DELAY_BETWEEN_CHANNELS_MS = 750; // stagger to stay well clear of FloodWait

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** entityId -> readInboxMaxId, built from one getDialogs() call shared across the whole scan. */
async function buildReadPointerMap(
  client: TelegramClient,
): Promise<Map<string, number>> {
  const pointers = new Map<string, number>();
  try {
    const dialogs = await client.getDialogs({ limit: 200 });
    for (const dialog of dialogs) {
      const entityId = (dialog as any).entity?.id?.toString();
      // `dialog.dialog` is the raw Api.Dialog, which carries readInboxMaxId —
      // the custom Dialog wrapper from getDialogs() doesn't surface it directly.
      const raw = (dialog as any).dialog as Api.Dialog | undefined;
      if (entityId && raw && typeof raw.readInboxMaxId === "number") {
        pointers.set(entityId, raw.readInboxMaxId);
      }
    }
  } catch (err) {
    const deathMarker = isSessionDeathError(err);
    if (deathMarker) {
      handleSessionDeath(deathMarker);
      return pointers;
    }
    console.error(
      "[watcher] reconcile: getDialogs failed, skipping read-pointer reconciliation this pass:",
      err instanceof Error ? err.message : String(err),
    );
  }
  return pointers;
}

let reconcileInFlight = false;

async function reconcileChannel(
  client: TelegramClient,
  entityId: string,
  mapped: ChannelMapEntry,
  readPointer: number | undefined,
) {
  const inputPeer = buildInputPeer(entityId, mapped);
  if (!inputPeer) return; // no accessHash cached yet — same self-heal path as handleReadUpdate

  // 1. Backfill catalogue: pull recent messages, insert anything missing.
  const messages = await client.getMessages(inputPeer, {
    limit: MESSAGES_PER_CHANNEL,
  });
  let backfilled = 0;
  for (const msg of messages) {
    const result = await catalogueMessage(mapped, entityId, msg as Api.Message);
    if (result?.saved) backfilled++;
  }

  // 2. Backfill progress: re-derive from the *current* read pointer, independent
  // of whether the UpdateReadChannelInbox event for it ever reached us.
  // If the read pointer is older than the most-recent window we fetched
  // above, fetch the window anchored at the read pointer (maxId: readPointer+1)
  // and scan it for the highest message that resolves to a chapter. This
  // mirrors the approach used by `handleReadUpdate` and avoids missing
  // progress after long downtimes or high-traffic channels.
  if (readPointer !== undefined) {
    const pointerMessages = await client.getMessages(inputPeer, {
      limit: MESSAGES_PER_CHANNEL,
      maxId: readPointer + 1,
    });

    // Choose the message closest to the read pointer (highest id <= readPointer)
    // that yields a chapter number when catalogued.
    let candidate: { id: number; chapterNum: number } | null = null;
    for (const msg of pointerMessages) {
      const msgId = (msg as any).id as number | undefined;
      if (typeof msgId !== "number" || msgId > readPointer) continue;

      const chapterNum =
        (await catalogueMessage(mapped, entityId, msg as Api.Message))
          ?.chapterNum ?? null;
      if (chapterNum !== null) {
        if (!candidate || msgId > candidate.id) {
          candidate = { id: msgId, chapterNum };
        }
      }
    }

    if (candidate) {
      const chapterRow = await repo.findChapter(
        mapped.manhwaId,
        candidate.chapterNum,
      );
      if (chapterRow) {
        const advanced = await repo.markAsReadIfNewer(
          mapped.manhwaId,
          chapterRow.id,
          candidate.chapterNum,
        );
        if (advanced) {
          console.log(
            `🔁 ${mapped.manhwaTitle} | Ch.${candidate.chapterNum} | reconcile ✅ advanced progress (missed live event)`,
          );
        }
      }
    }
  }

  if (backfilled > 0) {
    console.log(
      `🔁 ${mapped.manhwaTitle} | reconcile backfilled ${backfilled} chapter(s) from recent history`,
    );
  }
}

export async function reconcileAll(client: TelegramClient) {
  if (channelMap.size === 0) return;

  if (reconcileInFlight) {
    console.log(
      "[watcher] reconcile: previous run still in progress — skipping this scheduled pass.",
    );
    return;
  }

  reconcileInFlight = true;
  try {
    console.log(
      `[watcher] reconcile: scanning ${channelMap.size} channel(s)...`,
    );
    const readPointers = await buildReadPointerMap(client);

    for (const [entityId, mapped] of channelMap.entries()) {
      try {
        await reconcileChannel(
          client,
          entityId,
          mapped,
          readPointers.get(entityId),
        );
      } catch (err) {
        const deathMarker = isSessionDeathError(err);
        if (deathMarker) {
          handleSessionDeath(deathMarker);
          return;
        }
        console.error(
          `[watcher] reconcile: failed for ${mapped.manhwaTitle}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
      await sleep(DELAY_BETWEEN_CHANNELS_MS);
    }
    console.log("[watcher] reconcile: scan complete.");
  } finally {
    reconcileInFlight = false;
  }
}

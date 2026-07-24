import { TelegramClient } from 'telegram';
import { TelegramRepository } from '../../modules/telegram/telegram.repository';
import { isSessionDeathError, handleSessionDeath, alertUnresolvable } from './session';

export function normalizeEntityId(id: string): string;
export function normalizeEntityId(id: string | null): string | null;
export function normalizeEntityId(id: string | null): string | null {
  if (!id) return null;
  if (id.startsWith('-100')) return id.slice(4);
  if (id.startsWith('-')) return id.slice(1);
  return id;
}

export const repo = new TelegramRepository();

// entity id (channel/chat id, as a string) -> { manhwaId, sourceId, manhwaTitle, accessHash, entityType }
// accessHash/entityType are required to build a proper InputPeer for client.getMessages() —
// see handlers.ts. Without them, gramJS falls back to guessing the peer type from a bare
// numeric ID, which it defaults to PeerUser and fails with
// "Could not find the input entity" for anything that's actually a channel.
export type ChannelMapEntry = {
  manhwaId: number;
  sourceId: number;
  manhwaTitle: string;
  accessHash: string | null;
  entityType: 'channel' | 'chat' | 'user' | null;
};
export const channelMap = new Map<string, ChannelMapEntry>();

// Sources whose username resolution is currently flood-blocked, and when it's
// safe to try again. Prevents the 5-minute remap interval from hammering
// contacts.ResolveUsername again while a FloodWait is active (which would
// extend the ban instead of clearing it).
export const floodBlockedUntil = new Map<number, number>(); // sourceId -> epoch ms

export async function buildChannelMap(client: TelegramClient) {
  const telegramSources = await repo.getActiveTelegramSources();

  if (telegramSources.length === 0) {
    channelMap.clear();
    console.warn(
      '[watcher] No active telegram sources found. Add one via the "Add Source" ' +
      'form on a manhwa detail page (type = telegram, url = channel @username or invite link) ' +
      'before running this watcher.',
    );
    return;
  }

  // Only rebuild entries for sources not already mapped from a cached entity —
  // don't wipe + fully re-resolve everything every 5 minutes.
  const activeSourceIds = new Set(telegramSources.map((s) => s.sourceId));

  // A source's telegramEntityId can change without its row changing identity —
  // e.g. the bot's "replace" flow (wrong cached Chat ID corrected) updates the
  // existing row in place rather than inserting a new one. If we only ever add
  // new entityId keys, the OLD key sticks around in channelMap forever (nothing
  // else would ever delete it — the loop at the bottom only prunes by sourceId
  // absence, and this sourceId is still very much active). That leaves both the
  // stale and the corrected Chat ID mapped to the same manhwa at once, which is
  // exactly the duplicate-mapping failure mode the replace flow exists to avoid —
  // just living in this process's memory instead of the database.
  const currentEntityIdBySourceId = new Map(
    telegramSources.filter((s) => s.telegramEntityId).map((s) => [s.sourceId, normalizeEntityId(s.telegramEntityId as string)]),
  );
  for (const [entityId, mapped] of channelMap.entries()) {
    const current = currentEntityIdBySourceId.get(mapped.sourceId);
    if (current && current !== entityId) {
      console.log(
        `🔄 Telegram Source Updated\n\n` +
        `📚 ${mapped.manhwaTitle}\n\n` +
        `Old Chat ID\n${entityId}\n\n` +
        `New Chat ID\n${current}\n\n` +
        `✅ Removed stale mapping from watcher`,
      );
      channelMap.delete(entityId);
    }
  }

  for (const source of telegramSources) {
    const now = Date.now();
    const blockedUntil = floodBlockedUntil.get(source.sourceId);
    if (blockedUntil && now < blockedUntil) {
      continue; // still serving a FloodWait for this source; skip silently
    }

    try {
      let entityId: string;
      let accessHash: string | null;
      let entityType: 'channel' | 'chat' | 'user' | null;

      if (source.telegramEntityId && source.telegramEntityType) {
        // Fast path: use the cached entity ID directly — no Telegram API call needed.
        // We stored telegramEntityId precisely so we don't have to call getEntity()
        // on every remap. This is especially important for:
        //   - Private channels (t.me/c/...) where getEntity(InputPeerChannel) returns
        //     undefined on a fresh session that hasn't populated its local entity cache.
        //   - Avoiding any per-source API call (and thus any rate-limit exposure) on restart.
        // The channelMap key is the numeric channel/chat ID as a string — which is
        // exactly what message.chatId.toString() produces in the event handlers, so
        // matching works correctly without a round-trip through Telegram.
        entityId = normalizeEntityId(source.telegramEntityId);
        accessHash = source.telegramAccessHash ?? null;
        entityType = (source.telegramEntityType as 'channel' | 'chat' | 'user') ?? null;
      } else {
        // Slow path: only hit for a source we've never successfully resolved
        // before (e.g. newly added via the web UI).
        const entity = await client.getEntity(source.url);
        if (!entity) {
          console.warn(`[watcher] getEntity returned undefined for "${source.url}" — skipping (channel may be deleted, private, or inaccessible).`);
          alertUnresolvable(source.url, 'getEntity returned undefined');
          continue;
        }
        entityId = entity.id.toString();
        accessHash = (entity as any).accessHash?.toString() ?? null;
        entityType =
          entity.className === 'Channel' || entity.className === 'ChannelForbidden' ? 'channel' :
            entity.className === 'Chat' || entity.className === 'ChatForbidden' ? 'chat' :
              entity.className === 'User' ? 'user' : null;

        if (entityType) {
          await repo.cacheTelegramEntity(source.sourceId, entityId, accessHash, entityType);
          console.log(`[watcher] Cached ${entityType} entity for "${source.url}" — future starts skip ResolveUsername.`);
        } else {
          console.warn(`[watcher] Resolved "${source.url}" but got unexpected entity type "${entity.className}" — not caching.`);
        }
      }

      if (channelMap.has(entityId) && channelMap.get(entityId)!.manhwaId !== source.manhwaId) {
        console.warn(`[watcher] COLLISION: telegramEntityId ${entityId} is linked to manhwa ${source.manhwaId} but was already mapped to ${channelMap.get(entityId)!.manhwaId}. The latter will be overwritten.`);
      }

      channelMap.set(entityId, {
        manhwaId: source.manhwaId,
        sourceId: source.sourceId,
        manhwaTitle: source.manhwaTitle,
        accessHash,
        entityType,
      });
      floodBlockedUntil.delete(source.sourceId);
    } catch (err: any) {
      const deathMarker = isSessionDeathError(err);
      if (deathMarker) {
        handleSessionDeath(deathMarker);
        return; // process.exit() above; return defensively in case exit is ever stubbed in tests
      }
      if (err?.seconds) {
        // FloodWaitError: back off for exactly as long as Telegram asked,
        // and do NOT retry sooner — retrying early is what turns a 74-minute
        // wait into a much longer one.
        const until = Date.now() + err.seconds * 1000;
        floodBlockedUntil.set(source.sourceId, until);
        console.error(
          `[watcher] FloodWait resolving "${source.url}": locked until ${new Date(until).toISOString()} ` +
          `(${err.seconds}s). Not retrying before then.`,
        );
        // FloodWaits are high-impact and actionable — push to bot.
        alertUnresolvable(source.url, `FloodWait — locked until ${new Date(until).toISOString()} (${err.seconds}s)`, true);
      } else {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[watcher] Could not resolve entity for source url "${source.url}": ${message}`);
        alertUnresolvable(source.url, message);
      }
    }
  }

  // Drop entries for sources that were deactivated/deleted since the last build
  // (they're no longer in telegramSources at all — distinct from a source
  // that's merely flood-blocked, which stays mapped from its last good resolve).
  for (const [entityId, mapped] of channelMap.entries()) {
    if (!activeSourceIds.has(mapped.sourceId)) {
      channelMap.delete(entityId);
    }
  }

  console.log(`[watcher] channelMap has ${channelMap.size} channel(s) mapped.`);

  // Resolve missing access hashes for sources added via the bot
  // (they have telegramEntityId but no telegramAccessHash yet).
  await resolveAccessHashViaDialogs(client);
}

/**
 * For sources registered through the bot (which gives us the channel's numeric
 * entity ID but NOT the MTProto access hash), use client.getDialogs() to find
 * the matching channel in the user's joined dialogs list and cache its hash.
 *
 * This is called at the end of every buildChannelMap run. It only fetches
 * dialogs when there are actually sources with a missing hash, so the overhead
 * on a normally-running watcher is a single cheap DB query per remap cycle.
 */
export async function resolveAccessHashViaDialogs(client: TelegramClient) {
  const missing = await repo.getSourcesMissingAccessHash();
  if (missing.length === 0) return;

  console.log(`[watcher] ${missing.length} source(s) missing accessHash — scanning dialogs to resolve...`);

  let dialogs: any[];
  try {
    // 200 is usually enough; increase if the user has an unusually large dialog list.
    dialogs = await client.getDialogs({ limit: 200 });
  } catch (err: any) {
    const deathMarker = isSessionDeathError(err);
    if (deathMarker) { handleSessionDeath(deathMarker); return; }
    console.error('[watcher] getDialogs failed:', err instanceof Error ? err.message : String(err));
    return;
  }

  // Build a quick lookup: stringified entity ID → accessHash string
  const hashByEntityId = new Map<string, string>();
  for (const dialog of dialogs) {
    const entity = (dialog as any).entity;
    if (!entity?.id) continue;
    const hash = entity.accessHash?.toString();
    if (hash) hashByEntityId.set(entity.id.toString(), hash);
  }

  for (const src of missing) {
    if (!src.telegramEntityId) continue;
    const normalizedId = normalizeEntityId(src.telegramEntityId);
    const hash = hashByEntityId.get(normalizedId);
    if (hash) {
      await repo.cacheTelegramEntity(
        src.sourceId,
        normalizedId,
        hash,
        (src.telegramEntityType as 'channel' | 'chat' | 'user') ?? 'channel',
      );
      // Also add it to the channelMap so we don’t need to wait for the next remap cycle.
      channelMap.set(normalizedId, {
        manhwaId: src.manhwaId,
        sourceId: src.sourceId,
        manhwaTitle: '',  // title not needed for event matching
        accessHash: hash,
        entityType: (src.telegramEntityType as 'channel' | 'chat' | 'user') ?? 'channel',
      });
      console.log(`[watcher] Resolved accessHash for entity ${normalizedId} via dialogs.`);
    } else {
      console.warn(`[watcher] Entity ${normalizedId} not found in dialogs (not a member, or dialog list too short).`);
    }
  }
}
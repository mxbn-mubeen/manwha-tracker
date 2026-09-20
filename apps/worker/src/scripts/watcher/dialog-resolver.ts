import { TelegramClient } from 'teleproto';
import { isSessionDeathError, handleSessionDeath } from './session';
import { channelMap, normalizeEntityId, repo } from './channel-map';

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
      // Also update the channelMap in-process so we don't wait for the next remap cycle.
      // channelMap now stores ChannelMapEntry[] per entity; upsert this source's entry.
      // Note: manhwaId is always non-null on active telegram sources (enforced by schema),
      // but the Drizzle inferred type is number|null for joined selects — guard it.
      if (src.manhwaId == null) continue;
      const newEntry = {
        manhwaId: src.manhwaId,
        sourceId: src.sourceId,
        manhwaTitle: '',  // title not needed for event matching
        accessHash: hash,
        entityType: (src.telegramEntityType as 'channel' | 'chat' | 'user') ?? 'channel',
      };
      const existing = channelMap.get(normalizedId);
      if (existing) {
        const idx = existing.findIndex(e => e.sourceId === src.sourceId);
        if (idx >= 0) {
          // Only update the accessHash field, keep all other fields from the existing entry.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const e = existing[idx]!;
          existing[idx] = { manhwaId: e.manhwaId, sourceId: e.sourceId, manhwaTitle: e.manhwaTitle, accessHash: hash, entityType: e.entityType };
        } else {
          existing.push(newEntry);
        }
      } else {
        channelMap.set(normalizedId, [newEntry]);
      }
      console.log(`[watcher] Resolved accessHash for entity ${normalizedId} via dialogs.`);
    } else {
      console.warn(`[watcher] Entity ${normalizedId} not found in dialogs (not a member, or dialog list too short).`);
    }
  }
}

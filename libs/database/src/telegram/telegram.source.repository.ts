import { db } from '../db';
import { sources } from '../schema';
import { eq, and, sql } from 'drizzle-orm';

export class TelegramSourceRepository {
  /**
   * Create a telegram source that already has entity info pre-resolved
   * (e.g. from a forwarded message received by the alert bot).
   * The url is set to "https://t.me/c/<entityId>" so there's a stable,
   * unique URL for the (manhwaId, url) unique constraint.
   * accessHash is initially NULL — the watcher fills it in on next remap
   * via getDialogs() (see getSourcesMissingAccessHash below).
   */
  async addTelegramSourceWithEntity(
    manhwaId: number,
    entityId: string,
    title: string,
    entityType: 'channel' | 'chat' | 'user',
  ) {
    const url = `https://t.me/c/${entityId}`;

    // CodeRabbit: Add collision check before inserting. 
    // The same telegram channel cannot be linked to multiple manhwa simultaneously.
    const [existingEntity] = await db
      .select()
      .from(sources)
      .where(eq(sources.telegramEntityId, entityId))
      .limit(1);

    if (existingEntity && existingEntity.manhwaId !== manhwaId) {
      // Collision detected. Return null to signal bot handlers.
      return null;
    }

    const [source] = await db
      .insert(sources)
      .values({
        manhwaId,
        type: 'telegram',
        url,
        adapterKey: 'telegram',
        telegramEntityId: entityId,
        // accessHash left NULL — resolved by watcher on next remap
        telegramEntityType: entityType,
      })
      .onConflictDoNothing()
      .returning();

    if (source) return source;

    // Already existed on the SAME manhwa (which is fine) — return the existing row
    const [existing] = await db
      .select()
      .from(sources)
      .where(and(eq(sources.manhwaId, manhwaId), eq(sources.url, url)))
      .limit(1);
    return existing ?? null;
  }

  /** The existing telegram source (if any) already linked to this manhwa, regardless of entityId. */
  async findTelegramSourceByManhwaId(manhwaId: number) {
    const [row] = await db
      .select()
      .from(sources)
      .where(and(eq(sources.manhwaId, manhwaId), eq(sources.type, 'telegram')))
      .limit(1);
    return row ?? null;
  }

  /**
   * Re-point an existing source at a new Telegram entity (the "replace" branch of the
   * bot's already-exists conflict flow). accessHash is reset to NULL since it belongs
   * to the old entity — the watcher re-resolves it via getDialogs() on next remap.
   */
  async updateTelegramSourceEntity(
    sourceId: number,
    entityId: string,
    entityType: 'channel' | 'chat' | 'user',
  ) {
    const url = `https://t.me/c/${entityId}`;
    const [updated] = await db
      .update(sources)
      .set({ telegramEntityId: entityId, telegramAccessHash: null, telegramEntityType: entityType, url })
      .where(eq(sources.id, sourceId))
      .returning();
    return updated ?? null;
  }
}

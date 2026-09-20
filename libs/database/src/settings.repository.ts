import { db, settings } from './index';
import { eq } from 'drizzle-orm';

export class SettingsRepository {
  async get(key: string): Promise<string | null> {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    if (!row) return null;
    // values are stored as jsonb — strings are wrapped in quotes
    const v = row.value;
    if (typeof v === 'string') return v;
    if (typeof v === 'object' && v !== null && 'v' in v) return (v as { v: string }).v;
    return String(v);
  }

  async set(key: string, value: string): Promise<void> {
    await db
      .insert(settings)
      .values({ key, value: value as unknown as Record<string, unknown>, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: value as unknown as Record<string, unknown>, updatedAt: new Date() },
      });
  }

  /** Returns when a setting was last written, or null if it doesn't exist. */
  async getUpdatedAt(key: string): Promise<Date | null> {
    const [row] = await db
      .select({ updatedAt: settings.updatedAt })
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);
    return row?.updatedAt ?? null;
  }

  async delete(key: string): Promise<void> {
    await db.delete(settings).where(eq(settings.key, key));
  }

  /**
   * Compare-and-swap atomic lock acquisition.
   * Succeeds if the row doesn't exist, is currently set to "false", or is older than staleMs.
   */
  async claimLock(key: string, ownerToken: string, staleMs: number): Promise<boolean> {
    const { sql } = await import('drizzle-orm');
    const staleDate = new Date(Date.now() - staleMs);
    // In Drizzle/pg, a string inserted into a jsonb column gets serialized as a JSON string (e.g. '"false"').
    // We check against both the JSON string '"false"' and a literal boolean just in case.
    const res = await db.execute(sql`
      INSERT INTO ${settings} ("key", "value", "updated_at")
      VALUES (${key}, ${JSON.stringify(ownerToken)}::jsonb, NOW())
      ON CONFLICT ("key") DO UPDATE
      SET "value" = ${JSON.stringify(ownerToken)}::jsonb, "updated_at" = NOW()
      WHERE ${settings.value} = '"false"'::jsonb 
         OR ${settings.value} = 'false'::jsonb 
         OR ${settings.updatedAt} < ${staleDate}
      RETURNING id
    `);
    return res.rowCount !== undefined ? res.rowCount > 0 : (res as any).length > 0;
  }

  /**
   * Atomic lock release — only clears the lock if the current value matches the ownerToken.
   */
  async releaseLock(key: string, ownerToken: string): Promise<boolean> {
    const { and } = await import('drizzle-orm');
    const res = await db.update(settings)
      .set({ value: 'false' as unknown as Record<string, unknown>, updatedAt: new Date() })
      .where(and(
        eq(settings.key, key), 
        eq(settings.value, ownerToken as unknown as Record<string, unknown>)
      ))
      .returning({ id: settings.id });
    return res.length > 0;
  }
}

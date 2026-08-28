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
}

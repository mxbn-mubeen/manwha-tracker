/**
 * cron-sync.ts
 * ------------
 * One-shot script for the GitHub Actions cron (.github/workflows/sync-cron.yml).
 * Runs website-adapter sync directly against the Neon DB — no deployed/public
 * API required, since Neon is already reachable from anywhere via DATABASE_URL.
 *
 * Scope is 'websites' only. Telegram sources are intentionally excluded here:
 * they're handled by the persistent telegram-download-watcher.ts process
 * (a 30-min poll makes no sense for something event-driven, and this script
 * is a short-lived process that exits — it can't hold a live MTProto session).
 *
 * Exits non-zero on any per-source error so a failing run shows up red in
 * the GitHub Actions UI instead of silently succeeding.
 */
import 'dotenv/config';
import { SyncService } from '../modules/sync/sync.service';

async function main() {
  const service = new SyncService();
  const result = await service.run('websites');

  console.log(
    `[cron-sync] scanned=${result.scannedSources} newChapters=${result.newChapters} ` +
      `updatedManhwa=${result.updatedManhwa} duration=${result.duration}ms`,
  );

  if (result.errors.length > 0) {
    console.error(`[cron-sync] ${result.errors.length} error(s):`);
    for (const err of result.errors) console.error(`  - ${err}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[cron-sync] Fatal error:', err);
  process.exit(1);
});

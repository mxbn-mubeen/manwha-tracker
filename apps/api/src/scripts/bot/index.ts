/**
 * Telegram Bot Service  (@mhwaalertsbot)
 * ----------------------------------------
 * Long-polling Bot API service. Run alongside the watcher:
 *   npm run bot:telegram
 *
 * What it does:
 *
 *  OUTBOUND (alerts)
 *   - Sends session-death / FloodWait alerts from the watcher.
 *     See src/utils/bot-alert.ts — that utility calls this bot's HTTP API.
 *
 *  INBOUND (private channel registration)
 *   - /start         → saves your chat_id to DB settings (needed for alerts)
 *                      and prints a welcome/help message.
 *   - /help          → same info anytime.
 *   - /list          → lists all active telegram sources in DB.
 *   - Forward any message from a private channel → bot extracts entity info
 *                      and asks which manhwa ID to associate it with.
 *   - Reply with a number (manhwa ID) → creates the source row. The watcher
 *                      fills in the accessHash automatically on next remap
 *                      via client.getDialogs() (no ResolveUsername needed).
 *   - /cancel        → clear a pending forward.
 */
import '../../env';
import { poll } from './poll';

// ── Entry point ───────────────────────────────────────────────────────────────

poll().catch((err) => {
  console.error('[bot] Fatal:', err);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n[bot] Shutting down.');
  process.exit(0);
});

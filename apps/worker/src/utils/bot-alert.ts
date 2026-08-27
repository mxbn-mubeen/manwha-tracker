/**
 * Bot alert utility
 * -----------------
 * Sends a plain-text (HTML-parsed) message to @mhwaalertsbot via the
 * Telegram Bot API. Used by the watcher and bot service to push alerts
 * (session death, FloodWait, etc.) to the user's Telegram chat.
 *
 * Requirements (both must be set):
 *   TELEGRAM_BOT_TOKEN   - the BotFather token for @mhwaalertsbot
 *   TELEGRAM_ALERT_CHAT_ID - the user's personal Telegram numeric chat ID.
 *                            Run the bot and send /start to populate this
 *                            automatically into DB settings; then set the
 *                            env var to avoid a DB read on every alert.
 *
 * If either value is missing the call is a no-op — the watcher still works,
 * it just won't push Telegram notifications.
 */

let _chatId: string | null | undefined = undefined; // undefined = not yet resolved

/**
 * Override the cached chat ID at runtime (used by the bot service after
 * reading it from DB settings).
 */
export function setBotAlertChatId(chatId: string) {
  _chatId = chatId;
}

export async function sendBotAlert(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  // Resolve chat ID: env var wins, then in-memory cache (may have been set
  // by setBotAlertChatId() after reading DB settings).
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID ?? _chatId;
  if (!chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        // Silence link previews so stack traces don't expand into massive cards
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[bot-alert] sendMessage failed (${res.status}): ${body}`);
    }
  } catch (err) {
    // Network failure — don't propagate, the alert is best-effort.
    console.error('[bot-alert] fetch error:', err instanceof Error ? err.message : String(err));
  }
}

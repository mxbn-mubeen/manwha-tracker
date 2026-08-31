/**
 * Telegram download-watcher — long-running process, NOT part of the API server.
 *
 * Design: see .agents/brain/decisions.md ("Telegram download = auto Last Read")
 * and .agents/brain/patterns.md ("Progress Auto-Update from Telegram").
 *
 * Self-healing: uses a generation counter + health-check interval + activity watchdog
 * + scheduled rebuild to recover from wedged connections. Full rationale is in
 * .agents/brain/decisions.md ("watcher stops processing after TIMEOUT storms").
 * Migrated from GramJS → teleproto (gram-js/gramjs#753 — unresolved upstream bug).
 */
import "../../env";
import { TelegramClient, Api } from "teleproto";
import { NewMessage } from "teleproto/events";
import { Raw } from "teleproto/events/Raw";
import { SettingsRepository } from '@manhwa-tracker/database';
import { connectTelegramClient } from "../../utils/telegram-client";
import { setBotAlertChatId, sendBotAlert } from "../../utils/bot-alert";
import {
  resolveSession,
  handleSessionDeath,
  isSessionDeathError,
  NoSessionError,
} from "./session";
import { buildChannelMap, channelMap } from "./channel-map";
import { handleNewMessage, handleReadUpdate } from "./handlers";
import { reconcileAll } from "./reconcile";
import { setupWatcherIntervals } from "./intervals";

const API_ID = Number(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH ?? "";

if (!API_ID || !API_HASH) {
  console.error(
    "[watcher] Missing TELEGRAM_API_ID / TELEGRAM_API_HASH in env. Aborting.",
  );
  process.exit(1);
}

const settingsRepo = new SettingsRepository();

// Constants for restart backoffs
const RESTART_BACKOFF_BASE_MS = 30 * 1000;
const RESTART_BACKOFF_MAX_MS = 5 * 60 * 1000;

// How often to re-check for a session when none is configured yet (e.g. a
// fresh deploy before anyone has logged in via Settings → Telegram). Cheap —
// just a DB read — so a short interval is fine and means the watcher starts
// itself within a minute of login, no redeploy needed.
const NO_SESSION_POLL_INTERVAL_MS = 60 * 1000;

// Bumped on every rebuild so stale intervals/callbacks from a torn-down
// client generation can recognize they're obsolete and no-op instead of
// touching a client that's already been disconnected.
let currentGeneration = 0;

async function runWatcherGeneration(attempt = 0): Promise<void> {
  const generation = ++currentGeneration;
  const isCurrent = () => generation === currentGeneration;

  let SESSION: string;
  try {
    SESSION = await resolveSession();
  } catch (err) {
    if (err instanceof NoSessionError) {
      // Not an error state worth alerting on or backing off aggressively for —
      // this is the normal condition on a fresh deploy before anyone has
      // logged in yet. Log once per attempt at a low volume and just check
      // again shortly; as soon as Settings → Telegram saves a session, the
      // very next poll picks it up and starts the watcher with no redeploy.
      console.log(
        `[watcher] ${err.message} Rechecking in ${NO_SESSION_POLL_INTERVAL_MS / 1000}s...`,
      );
      setTimeout(() => {
        if (generation !== currentGeneration) return; // superseded
        runWatcherGeneration(attempt).catch((e) =>
          console.error("[watcher] Retry after NoSessionError failed:", e),
        );
      }, NO_SESSION_POLL_INTERVAL_MS);
      return;
    }
    throw err; // genuine unexpected failure — let it surface normally
  }
  const { client, transport } = await connectTelegramClient({
    session: SESSION,
    apiId: API_ID,
    apiHash: API_HASH,
    options: {
      // -1 = retry forever *at the transport level* for ordinary hiccups.
      // This is no longer our only line of defense against a wedged
      // connection — the health-check + watchdog below will tear the whole
      // client down and rebuild it if this connection stops making progress.
      connectionRetries: -1,
      retryDelay: 2000,
      // Default is 10s, which is tight for a container with inconsistent egress —
      // bumping it cuts down on false-positive TIMEOUTs from normal latency spikes.
      timeout: 60,
      // GramJS doesn't support a `catchUp` constructor option on this package
      // version, so rely on the separate reconcile pass to backfill missed updates.
    },
  });
  console.log(`[watcher] Connected to Telegram using ${transport} transport.`);

  // Disable internal logging to prevent memory leaks over long idling periods
  // @ts-expect-error: GramJS log level types are restrictive but 'none' is supported at runtime
  client.setLogLevel("none");

  // Track intervals so we can clear them on graceful shutdown / rebuild.
  const intervals: ReturnType<typeof setInterval>[] = [];
  let lastActivityAt = Date.now();
  let consecutiveHealthFailures = 0;
  let tornDown = false;

  const touchActivity = () => {
    lastActivityAt = Date.now();
  };

  const teardown = () => {
    if (tornDown) return;
    tornDown = true;
    for (const id of intervals) clearInterval(id);
    client.disconnect().catch(() => {
      /* best-effort */
    });
  };

  /** Graceful, permanent stop — used for session death. No restart follows. */
  const shutdown = () => {
    teardown();
    console.log("[watcher] Watcher stopped. API server keeps running.");
  };

  /** Tear the current connection down and rebuild a fresh client after a backoff. */
  const rebuild = (reason: string) => {
    if (!isCurrent() || tornDown) return; // already superseded or shutting down
    teardown();
    const delay = Math.min(
      RESTART_BACKOFF_BASE_MS * (attempt + 1),
      RESTART_BACKOFF_MAX_MS,
    );
    console.error(
      `[watcher] Rebuilding Telegram client (generation ${generation} -> ${generation + 1}): ${reason}. ` +
        `Reconnecting in ${Math.round(delay / 1000)}s.`,
    );
    sendBotAlert(
      `🟠 <b>Watcher reconnecting</b>\n\n${reason}\n\nRebuilding the Telegram connection now; updates were paused during the outage and will resume once reconnected.`,
    ).catch(() => {
      /* best-effort — don't let alert failure block the actual recovery */
    });
    setTimeout(() => {
      runWatcherGeneration(attempt + 1).catch((e) =>
        console.error("[watcher] Rebuild attempt failed:", e),
      );
    }, delay);
  };

  try {
    await client.connect();
  } catch (err) {
    const deathMarker = isSessionDeathError(err);
    if (deathMarker) {
      handleSessionDeath(deathMarker, shutdown);
      return;
    }
    // Genuine connectivity issue at startup (network unreachable, DC down) —
    // back off and retry instead of letting it bubble up and kill the process.
    rebuild(
      `initial connect failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return;
  }
  console.log("[watcher] Connected to Telegram.");
  touchActivity();

  // Warm the bot-alert chat ID from DB settings so session-death alerts can
  // be sent even if the bot service isn't running in this process.
  const alertChatId = await settingsRepo.get("telegram_alert_chat_id");
  if (alertChatId) {
    setBotAlertChatId(alertChatId);
    console.log("[watcher] Bot alert chat ID loaded from DB settings.");
  }

  await buildChannelMap(client);

  const me = (await client.getMe().catch(() => null)) as {
    username?: string;
    firstName?: string;
  } | null;
  const identity = me
    ? me.username
      ? `@${me.username}`
      : (me.firstName ?? "unknown")
    : "unknown";
  console.log(
    `🚀 Telegram Watcher Started\n\n` +
      `📦 Sources Loaded : ${channelMap.size}\n` +
      `👤 Session        : ${identity}` +
      (attempt > 0 ? `\n🔁 Recovered after ${attempt} rebuild attempt(s)` : ""),
  );

  intervals.push(...setupWatcherIntervals(client, isCurrent, rebuild, shutdown, () => lastActivityAt));

  client.addEventHandler((event) => {
    touchActivity();
    return handleNewMessage(event);
  }, new NewMessage({}));

  client.addEventHandler((update: Api.TypeUpdate) => {
    if (update instanceof Api.UpdateReadChannelInbox) {
      touchActivity();
      const chatId = update.channelId.toString();
      if (channelMap.has(chatId)) {
        // The rich, per-chapter log line is emitted inside handleReadUpdate
        // once it knows the manhwa/chapter — logging here too would just be noise.
        handleReadUpdate(client, chatId, update.maxId).catch((e) =>
          console.error("[watcher] handleReadUpdate error:", e),
        );
      }
    } else if (update instanceof Api.UpdateReadHistoryInbox) {
      touchActivity();
      const chatId =
        (update.peer as any)?.channelId?.toString() ??
        (update.peer as any)?.chatId?.toString();
      if (chatId && channelMap.has(chatId)) {
        handleReadUpdate(client, chatId, update.maxId).catch((e) =>
          console.error("[watcher] handleReadUpdate error:", e),
        );
      }
    }
  }, new Raw({}));

  console.log(
    "[watcher] Listening for new chapters and read-events on tracked channels...",
  );
}

export async function startWatcher() {
  await runWatcherGeneration();
}

// If running as a standalone script (e.g. npm run watch:telegram)
if (require.main === module) {
  startWatcher().catch((err) => {
    console.error("[watcher] Fatal error:", err);
    process.exit(1);
  });

  process.on("SIGINT", () => {
    console.log("\n[watcher] Shutting down.");
    process.exit(0);
  });
}

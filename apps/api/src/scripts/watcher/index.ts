/**
 * Telegram download-watcher
 * -------------------------
 * Long-running process (NOT part of the Express/tRPC server — run it as its
 * own PM2/systemd service, separate from `pnpm dev`).
 *
 * Design, per .agents/brain/decisions.md ("Telegram download = auto Last Read")
 * and .agents/brain/patterns.md ("Progress Auto-Update from Telegram"):
 *
 *   1. NewMessage on a tracked channel  -> catalogue the chapter (insert into
 *      `chapters`, idempotent). This alone does NOT touch progress.
 *   2. UpdateReadChannelInbox / UpdateReadHistoryInbox on a tracked channel
 *      -> the user's Telegram read-pointer moved (opened the app, opened the
 *      file, read it from their phone — GramJS/MTProto has no separate
 *      "file downloaded" event; the read-receipt is the closest real signal
 *      to "the user consumed this"). We resolve the newest message at-or-below
 *      the new read pointer, extract its chapter number, and mark it as last
 *      read — but only if it's actually newer than what's already recorded.
 *
 * IMPORTANT CAVEAT (read before relying on this):
 * MTProto's "read" update fires when ANY client logged into this account
 * reads the channel — including this watcher itself calling getMessages(),
 * which can mark things read as a side effect. We deliberately avoid calling
 * anything that marks messages read (no client.markAsRead / no auto-download)
 * so the only source of read-pointer movement is the user's own client(s).
 * This has not been run against a live Telegram session — verify against
 * your actual channels before trusting it unattended.
 *
 * SELF-HEALING (see .agents/brain — "watcher stops processing after TIMEOUT storms"):
 * connectionRetries: -1 makes GramJS retry a broken connection forever, but it
 * retries the SAME connection — if the underlying MTProto sender gets wedged
 * (the "Error: TIMEOUT" storms seen in prod logs), infinite retries on that one
 * connection never recovers it, and updates silently stop forever with no
 * crash and no alert. Two independent nets catch that now:
 *   - The periodic getMe() health check counts CONSECUTIVE failures (not just
 *     auth-death markers). After a few in a row it tears down and rebuilds the
 *     client from scratch instead of trusting GramJS's internal retry loop.
 *   - A "last real activity" watchdog restarts the watcher if no actual
 *     Telegram event (new message / read update) has arrived in a long time —
 *     deliberately NOT reset by getMe() or reconcile succeeding, since prod
 *     logs (client/updates.js _updateLoop) show GramJS's own update-fetching
 *     loop can get stuck retrying "Error: TIMEOUT" forever while completely
 *     unrelated RPCs like getMe() keep working fine. That loop also appears
 *     to swallow its own errors internally — including, apparently, an
 *     AUTH_KEY_* session death, which came out as endless generic TIMEOUTs
 *     instead of ever reaching our AUTH_KEY_* detection — so it can't be
 *     trusted to surface anything to app code at all.
 *   - Because of that last point, an unconditional scheduled rebuild runs on
 *     a fixed timer regardless of whether any problem was detected, as a
 *     backstop against wedges that are invisible to both checks above.
 * All paths funnel into the same recreate-the-client routine, with backoff
 * so a real outage doesn't spin-loop reconnect attempts.
 */
import "../../env";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { Raw } from "telegram/events/Raw";
import { SettingsRepository } from "../../modules/settings/settings.repository";
import { setBotAlertChatId, sendBotAlert } from "../../utils/bot-alert";
import {
  resolveSession,
  handleSessionDeath,
  isSessionDeathError,
} from "./session";
import { buildChannelMap, channelMap } from "./channel-map";
import { handleNewMessage, handleReadUpdate } from "./handlers";
import { reconcileAll } from "./reconcile";

const API_ID = Number(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH ?? "";

if (!API_ID || !API_HASH) {
  console.error(
    "[watcher] Missing TELEGRAM_API_ID / TELEGRAM_API_HASH in env. Aborting.",
  );
  process.exit(1);
}

const settingsRepo = new SettingsRepository();

// How many consecutive getMe() health-check failures (non-auth) before we
// give up on the current connection and rebuild the client from scratch.
// 3 failures * 5-minute interval = ~15 minutes of confirmed unresponsiveness.
const MAX_CONSECUTIVE_HEALTH_FAILURES = 3;
const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Independent backstop: if truly nothing has happened (no live event, no
// successful health ping) for this long, force a rebuild even if the health
// check itself hasn't tripped. Generously above normal low-traffic lulls.
const ACTIVITY_WATCHDOG_MS = 45 * 60 * 1000;
const ACTIVITY_WATCHDOG_CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Backoff between rebuild attempts, so a genuine outage (Telegram down,
// network unreachable) doesn't turn into a tight reconnect loop.
const RESTART_BACKOFF_BASE_MS = 30 * 1000;
const RESTART_BACKOFF_MAX_MS = 5 * 60 * 1000;

// Unconditional rebuild on a fixed schedule, regardless of whether any
// problem has been detected. See the SELF-HEALING note above: GramJS's own
// internal update loop can wedge and swallow its errors without ever
// surfacing them to app code, so detection-based recovery alone isn't
// trustworthy — this bounds the worst case.
const SCHEDULED_RESTART_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours

// Bumped on every rebuild so stale intervals/callbacks from a torn-down
// client generation can recognize they're obsolete and no-op instead of
// touching a client that's already been disconnected.
let currentGeneration = 0;

async function runWatcherGeneration(attempt = 0): Promise<void> {
  const generation = ++currentGeneration;
  const isCurrent = () => generation === currentGeneration;

  const SESSION = await resolveSession();
  const client = new TelegramClient(
    new StringSession(SESSION),
    API_ID,
    API_HASH,
    {
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
  );

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

  // Re-map every 5 minutes so newly-added sources (via the web UI) get picked up
  // without restarting the process.
  intervals.push(
    setInterval(() => {
      if (!isCurrent()) return;
      buildChannelMap(client).catch((e) =>
        console.error("[watcher] remap failed:", e),
      );
    }, 5 * 60 * 1000),
  );

  // Proactive session health check, independent of channel activity — a dead
  // session with no tracked channels posting anything would otherwise sit
  // silently until the next remap's getEntity call happens to fail.
  //
  // Also doubles as the primary detector for a wedged connection: repeated
  // non-auth failures here (e.g. the getMe() call itself timing out) mean the
  // connection GramJS is endlessly retrying internally isn't actually
  // recovering, so after a few in a row we rebuild the client outright rather
  // than trusting it to fix itself.
  intervals.push(
    setInterval(async () => {
      if (!isCurrent()) return;
      try {
        await client.getMe();
        consecutiveHealthFailures = 0;
        // Deliberately NOT touchActivity() here: getMe() is an independent
        // RPC call, separate from GramJS's internal update-fetching loop
        // (client/updates.js _updateLoop). Prod logs have shown that loop can
        // get stuck retrying "Error: TIMEOUT" forever — swallowing its own
        // errors internally, including what may actually be a masked
        // AUTH_KEY_* death — without ever throwing anything our code sees.
        // getMe() can keep succeeding the whole time that's happening, so
        // treating it as "activity" would blind the watchdog below to the
        // exact failure mode it exists to catch.
      } catch (err) {
        const deathMarker = isSessionDeathError(err);
        if (deathMarker) {
          handleSessionDeath(deathMarker, shutdown);
          return;
        }
        consecutiveHealthFailures++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[watcher] Health check failed (${consecutiveHealthFailures}/${MAX_CONSECUTIVE_HEALTH_FAILURES}): ${message}`,
        );
        if (consecutiveHealthFailures >= MAX_CONSECUTIVE_HEALTH_FAILURES) {
          rebuild(
            `${consecutiveHealthFailures} consecutive health-check failures (${message}) — connection likely stuck in a retry loop`,
          );
        }
      }
    }, HEALTH_CHECK_INTERVAL_MS),
  );

  // Independent backstop: even if getMe() keeps succeeding, if literally no
  // real activity (event or health ping) has landed in a long time, force a
  // rebuild. Catches failure modes where a fresh RPC still goes through but
  // the persistent update stream itself has silently stopped delivering.
  intervals.push(
    setInterval(() => {
      if (!isCurrent()) return;
      const idleMs = Date.now() - lastActivityAt;
      if (idleMs >= ACTIVITY_WATCHDOG_MS) {
        rebuild(
          `no watcher activity for ${Math.round(idleMs / 60000)} minutes`,
        );
      }
    }, ACTIVITY_WATCHDOG_CHECK_INTERVAL_MS),
  );

  // Second safety net independent of the live event stream — see reconcile.ts
  // for why this exists on top of catchUp. Run once shortly after startup
  // (covers whatever happened while the watcher was down/deploying), then on
  // a fixed interval after that.
  setTimeout(() => {
    if (!isCurrent()) return;
    // Not treated as "activity" either, for the same reason as getMe() above —
    // a reconcile pass that finds nothing new still proves only that
    // getMessages()/getDialogs() RPCs work, not that the live push stream is
    // alive. Only real incoming events (below) count toward the watchdog.
    reconcileAll(client).catch((e) =>
      console.error("[watcher] initial reconcile failed:", e),
    );
  }, 30_000);
  intervals.push(
    setInterval(() => {
      if (!isCurrent()) return;
      reconcileAll(client).catch((e) =>
        console.error("[watcher] reconcile failed:", e),
      );
    }, 15 * 60 * 1000),
  );

  // Unconditional backstop, independent of every detection mechanism above.
  // The prod logs show GramJS's internal update loop can swallow its own
  // errors (including a possibly-masked AUTH_KEY death) and retry forever
  // without ever surfacing anything our error handlers or health checks can
  // see. No amount of "detect and react" logic can be trusted to catch every
  // variant of that, so on a fixed schedule we rebuild the client outright —
  // cheap, safe (in-flight work isn't lost, just briefly paused), and bounds
  // the worst case for an otherwise-invisible wedge to this interval instead
  // of "forever, silently, until someone notices manually."
  intervals.push(
    setInterval(() => {
      if (!isCurrent()) return;
      rebuild(
        "scheduled periodic rebuild (safety net against silent internal-loop wedges)",
      );
    }, SCHEDULED_RESTART_INTERVAL_MS),
  );

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

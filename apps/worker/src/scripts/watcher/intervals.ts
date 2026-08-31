import { TelegramClient } from "teleproto";
import { buildChannelMap } from "./channel-map";
import { reconcileAll } from "./reconcile";
import { handleSessionDeath, isSessionDeathError } from "./session";

const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const MAX_CONSECUTIVE_HEALTH_FAILURES = 3;
const ACTIVITY_WATCHDOG_MS = 45 * 60 * 1000;
const ACTIVITY_WATCHDOG_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const SCHEDULED_RESTART_INTERVAL_MS = 3 * 60 * 60 * 1000;

export function setupWatcherIntervals(
  client: TelegramClient,
  isCurrent: () => boolean,
  rebuild: (reason: string) => void,
  shutdown: () => void,
  getLastActivityAt: () => number,
): ReturnType<typeof setInterval>[] {
  const intervals: ReturnType<typeof setInterval>[] = [];
  let consecutiveHealthFailures = 0;

  // Re-map every 5 minutes
  intervals.push(
    setInterval(() => {
      if (!isCurrent()) return;
      buildChannelMap(client).catch((e) => console.error("[watcher] remap failed:", e));
    }, 5 * 60 * 1000)
  );

  // Proactive session health check
  intervals.push(
    setInterval(async () => {
      if (!isCurrent()) return;
      try {
        await client.getMe();
        consecutiveHealthFailures = 0;
      } catch (err) {
        const deathMarker = isSessionDeathError(err);
        if (deathMarker) {
          handleSessionDeath(deathMarker, shutdown);
          return;
        }
        consecutiveHealthFailures++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[watcher] Health check failed (${consecutiveHealthFailures}/${MAX_CONSECUTIVE_HEALTH_FAILURES}): ${message}`);
        if (consecutiveHealthFailures >= MAX_CONSECUTIVE_HEALTH_FAILURES) {
          rebuild(`${consecutiveHealthFailures} consecutive health-check failures (${message})`);
        }
      }
    }, HEALTH_CHECK_INTERVAL_MS)
  );

  // Activity watchdog
  intervals.push(
    setInterval(() => {
      if (!isCurrent()) return;
      const idleMs = Date.now() - getLastActivityAt();
      if (idleMs >= ACTIVITY_WATCHDOG_MS) {
        rebuild(`no watcher activity for ${Math.round(idleMs / 60000)} minutes`);
      }
    }, ACTIVITY_WATCHDOG_CHECK_INTERVAL_MS)
  );

  // Reconcile
  setTimeout(() => {
    if (!isCurrent()) return;
    reconcileAll(client).catch((e) => console.error("[watcher] initial reconcile failed:", e));
  }, 10_000);
  
  intervals.push(
    setInterval(() => {
      if (!isCurrent()) return;
      reconcileAll(client).catch((e) => console.error("[watcher] reconcile failed:", e));
    }, 5 * 60 * 1000)
  );

  // Scheduled restart
  intervals.push(
    setInterval(() => {
      if (!isCurrent()) return;
      rebuild("scheduled periodic rebuild");
    }, SCHEDULED_RESTART_INTERVAL_MS)
  );

  return intervals;
}

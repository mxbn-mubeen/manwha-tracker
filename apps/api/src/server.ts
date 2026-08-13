import "./env";
import { timingSafeEqual } from "crypto";
import express from "express";
import cors from "cors";

// Log-and-continue instead of Node's default (silently crash the whole
// process) for anything that slips through — a diagnostic safety net so a
// future unguarded async handler shows up as a log line instead of a gap
// in the logs with no explanation, the way today's watcher crash likely did.
process.on("unhandledRejection", (reason) => {
  console.error(
    "[server] Unhandled rejection (process kept alive):",
    reason instanceof Error ? reason.stack || reason.message : reason,
  );
});
process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception (process kept alive):", err.stack || err.message);
});

import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./root";
import { SyncService } from "./modules/sync/sync.service";
import { TriggerSyncSchema } from "./modules/sync/sync.router";
import { startWatcher } from "./scripts/watcher";
import { poll as startBot, stopPolling } from "./scripts/bot/poll";

const app = express();
const PORT = process.env.PORT || 3001;

// Allow the Vite frontend (port 3000) to call this API
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      // Set FRONTEND_URL to your Vercel domain in Cloud Run env vars
      // e.g. https://manwha-tracker.vercel.app
      process.env.FRONTEND_URL || "",
    ].filter(Boolean),
    credentials: true,
  }),
);

app.use(express.json());

// Mount tRPC on /trpc
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => ({ req }),
  }),
);

/**
 * Secret-protected REST route for triggering a sync from outside the app —
 * e.g. the GitHub Actions cron workflow (.github/workflows/sync-cron.yml),
 * for setups where the API is deployed somewhere publicly reachable.
 *
 * If you haven't deployed the API anywhere yet (still localhost-only), prefer
 * running `apps/api/src/scripts/cron-sync.ts` directly from the Action instead —
 * it talks straight to the Neon DB and doesn't need this route or a public API.
 *
 * Fails closed: if SYNC_SECRET isn't set, this route is disabled entirely
 * rather than silently accepting unauthenticated requests.
 */
const syncService = new SyncService();
let syncInProgress = false;

function parseEnvFlag(name: string, defaultValue: boolean) {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  return !["0", "false", "no"].includes(raw.trim().toLowerCase());
}

app.post("/api/sync", async (req, res) => {
  const configuredSecret = process.env.SYNC_SECRET;
  if (!configuredSecret) {
    res
      .status(503)
      .json({
        error: "SYNC_SECRET is not configured on this server — route disabled.",
      });
    return;
  }

  const providedSecret = req.header("x-sync-secret");
  const expected = Buffer.from(configuredSecret);
  const provided = Buffer.from(providedSecret ?? "");
  const isAuthorized =
    expected.length === provided.length && timingSafeEqual(expected, provided);

  if (!isAuthorized) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (syncInProgress) {
    res.status(409).json({ error: "A sync is already running." });
    return;
  }

  const parsed = TriggerSyncSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  try {
    syncInProgress = true;
    const result = await syncService.run(parsed.data.scope);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  } finally {
    syncInProgress = false;
  }
});

app.get("/api/proxy-image", async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    res.status(400).send("No url provided");
    return;
  }
  try {
    // Use a dynamic ESM import for `got-scraping`. Importing the bare
    // specifier lets Node resolve the package via its ESM `exports` map
    // (which `require.resolve` can fail on for ESM-only packages).
    const dynamicImport = new Function('modulePath', 'return import(modulePath)');
    const { gotScraping } = await dynamicImport('got-scraping');
    
    const stream = gotScraping.stream({
      url,
      headers: { referer: 'https://mangadex.org' },
    });
    
    stream.on('response', (response: any) => {
      res.set('Content-Type', response.headers['content-type']);
      res.set('Cache-Control', 'public, max-age=31536000');
    });
    
    stream.on('error', (err: Error) => {
      console.error("[server] proxy-image error:", err.message);
      if (!res.headersSent) res.status(502).send("Proxy error");
    });

    stream.pipe(res);
  } catch (err) {
    console.error("[server] proxy-image exception:", err);
    res.status(500).send("Internal proxy error");
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// TEMPORARY diagnostic route — remove once the DC5 connectivity issue is
// resolved. Tests raw TCP reachability from inside this container to
// Telegram's data centers, since Render's free tier has no Shell access.
// Usage: GET /api/net-check?secret=YOUR_SYNC_SECRET
app.get("/api/net-check", async (req, res) => {
  const configuredSecret = process.env.SYNC_SECRET;
  if (!configuredSecret || req.query.secret !== configuredSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const net = await import("net");
  const tcpProbe = (
    host: string,
    port: number,
    timeoutMs = 8000,
  ): Promise<{ host: string; port: number; ok: boolean; ms: number; error?: string }> =>
    new Promise((resolve) => {
      const start = Date.now();
      const socket = new net.Socket();
      let settled = false;
      const finish = (ok: boolean, error?: string) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({ host, port, ok, ms: Date.now() - start, error });
      };
      socket.setTimeout(timeoutMs);
      socket.once("connect", () => finish(true));
      socket.once("timeout", () => finish(false, "timeout"));
      socket.once("error", (err) => finish(false, err.message));
      socket.connect(port, host);
    });

  const targets: [string, number, string][] = [
    ["91.108.56.130", 443, "Telegram DC5 (Singapore) - the one failing"],
    ["149.154.167.51", 443, "Telegram DC4 (Amsterdam) - control"],
    ["149.154.167.40", 443, "Telegram DC2 (Amsterdam) - control"],
    ["8.8.8.8", 443, "Google DNS - sanity check unrelated to Telegram"],
  ];

  const results = await Promise.all(
    targets.map(([host, port, label]) =>
      tcpProbe(host, port).then((r) => ({ ...r, label })),
    ),
  );

  res.json({ timestamp: new Date().toISOString(), results });
});

// Friendly landing page for the bare root — this is an API-only service with
// no UI of its own, so without this route, visiting the domain directly just
// shows Express's default "Cannot GET /" (which is harmless, but confusing).
app.get("/", (_req, res) => {
  res.json({
    service: "manwha-tracker-api",
    status: "ok",
    message: "This is the backend API — there's no browsable page here. Use the web app instead.",
    frontend: process.env.FRONTEND_URL || undefined,
    health: "/health",
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);

  const enableTelegramWatcher =
    Boolean(process.env.TELEGRAM_API_ID) &&
    parseEnvFlag("START_TELEGRAM_WATCHER", true);
  const enableTelegramBot =
    Boolean(process.env.TELEGRAM_BOT_TOKEN) &&
    parseEnvFlag("START_TELEGRAM_BOT", true);

  // Start the Telegram watcher in the background
  if (enableTelegramWatcher) {
    console.log("🔄 Starting Telegram watcher...");
    startWatcher().catch((err) => {
      console.error("❌ Failed to start Telegram watcher:", err);
    });
  } else if (process.env.TELEGRAM_API_ID) {
    console.log(
      "⚠️ Skipping Telegram watcher because START_TELEGRAM_WATCHER is disabled.",
    );
  } else {
    console.log("⚠️ Skipping Telegram watcher (TELEGRAM_API_ID not set)");
  }

  // Start the Telegram bot in the background
  if (enableTelegramBot) {
    console.log("🤖 Starting Telegram bot...");
    startBot().catch((err) => {
      console.error("❌ Failed to start Telegram bot:", err);
    });
  } else if (process.env.TELEGRAM_BOT_TOKEN) {
    console.log(
      "⚠️ Skipping Telegram bot because START_TELEGRAM_BOT is disabled.",
    );
  } else {
    console.log("⚠️ Skipping Telegram bot (TELEGRAM_BOT_TOKEN not set)");
  }
});

// Render (and other rolling-deploy hosts) send SIGTERM to the outgoing
// instance once the new one is healthy. Without this, the old process's
// getUpdates long-poll can stay open up to 30s, during which both instances
// poll Telegram at once and every call fails with a getUpdates Conflict.
// Stopping the poll loop immediately shrinks that overlap to ~instant.
let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} received, shutting down...`);
  stopPolling();
  server.close(() => {
    console.log("[server] HTTP server closed.");
    process.exit(0);
  });
  // Safety net in case something (e.g. an open DB connection) hangs close().
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
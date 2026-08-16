import "./env";
import express from "express";
import cors from "cors";

import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./root";
import { startWatcher } from "./scripts/watcher";
import { poll as startBot, stopPolling } from "./scripts/bot/poll";
import { syncRouter } from "./routes/sync";
import { proxyRouter } from "./routes/proxy";
import { healthRouter } from "./routes/health";

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

app.use("/api/sync", syncRouter);
app.use("/api/proxy-image", proxyRouter);
app.use("/", healthRouter);

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

function parseEnvFlag(name: string, defaultValue: boolean) {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  return !["0", "false", "no"].includes(raw.trim().toLowerCase());
}

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
import "./env";
import express from "express";
import cors from "cors";

import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./root";
import { proxyRouter } from "./routes/proxy";
import { healthRouter } from "./routes/health";

// Log-and-continue for unhandled async errors — keeps the process alive
// instead of silently crashing.
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

// CORS — dynamically reflect the origin to prevent CORS issues with preview URLs
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow any origin
      callback(null, origin || '*');
    },
    credentials: true,
  }),
);

app.use(express.json());

// tRPC — all fast API routes (manhwa, settings, sync.getHistory, sync.isSyncing)
// sync.run is intentionally excluded from this server — it runs on the worker.
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => ({ req }),
  }),
);

app.use("/api/proxy-image", proxyRouter);
app.use("/", healthRouter);

app.get("/", (_req, res) => {
  res.json({
    service: "manwha-tracker-api",
    status: "ok",
    message: "Fast tRPC API — Telegram/sync runs on the worker service.",
    health: "/health",
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
});

// Graceful shutdown for rolling deploys (Render sends SIGTERM)
let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} received, shutting down...`);
  server.close(() => {
    console.log("[server] HTTP server closed.");
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

import "./env";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./root";
import { CoverRepository } from "@manhwa-tracker/database";

// Log and exit for unhandled async errors.
// Keeping the process alive after an unhandled exception is an anti-pattern
// as it leaves the node process in an undefined state.
process.on("unhandledRejection", (reason) => {
  console.error(
    "[server] Unhandled rejection:",
    reason instanceof Error ? reason.stack || reason.message : reason,
  );
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception:", err.stack || err.message);
  process.exit(1);
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
app.use(cookieParser(process.env.SESSION_SECRET || 'fallback-secret-for-dev'));

// ── Security headers ─────────────────────────────────────────────────────────
// Applied to every response. Keeps the API hardened without pulling in helmet.
app.disable('x-powered-by');
app.use((_req, res, next) => {
  // Prevent MIME-sniffing attacks
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Disallow framing (clickjacking protection)
  res.setHeader('X-Frame-Options', 'DENY');
  // Don't leak the full referrer URL to third-party hosts
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // This is a JSON API — no need to prefetch DNS for linked resources
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  // Restrict browser features that a JSON API never uses
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// tRPC — all fast API routes (manhwa, settings, sync.getHistory, sync.isSyncing)
// sync.run is intentionally excluded from this server — it runs on the worker.
app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => ({ req }),
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "manwha-tracker-api" });
});

// ── Cover binary endpoints ──────────────────────────────────────────────────
const coverRepo = new CoverRepository();

/**
 * GET /cover/:id?v=<hash>
 * Serve a compressed WebP cover. The `v` query param is the content hash;
 * if it matches the stored hash, respond with immutable cache headers.
 */
app.get("/cover/:id", async (req, res) => {
  const manhwaId = parseInt(req.params.id || '', 10);
  if (isNaN(manhwaId)) {
    res.status(400).json({ error: "Invalid manhwa id." });
    return;
  }

  const cover = await coverRepo.getByManhwaId(manhwaId).catch(() => null);
  if (!cover) {
    res.status(404).json({ error: "No cover found for this manhwa." });
    return;
  }

  const clientHash = req.query.v;
  if (clientHash && clientHash === cover.contentHash) {
    // Client already has this exact version.
    res.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    // New version — still cacheable but will be revalidated on next mismatch.
    res.set("Cache-Control", "public, max-age=86400");
  }

  res.set("Content-Type", cover.contentType);
  res.set("ETag", `"${cover.contentHash}"`);
  res.end(cover.coverData);
});

/**
 * POST /cover/:id
 * Upload a cover image as raw binary body (Content-Type: image/*)
 * Max size: 512 KB. Requires auth cookie.
 */
app.post("/cover/:id", express.raw({ type: ["image/webp", "image/jpeg", "image/png", "image/*"], limit: "512kb" }), async (req, res) => {
  const session = req.signedCookies?.session;
  if (!session || session !== "authenticated") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const manhwaId = parseInt(req.params.id || '', 10);
  if (isNaN(manhwaId)) {
    res.status(400).json({ error: "Invalid manhwa id." });
    return;
  }

  const body = req.body as Buffer;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    res.status(400).json({ error: "Body must be a non-empty binary image." });
    return;
  }

  const contentType = ((req.headers["content-type"] || "image/webp").split(";")[0] ?? "image/webp").trim();

  const hash = await coverRepo.upsert(manhwaId, body, contentType).catch((err: Error) => {
    console.error("[cover] Failed to upsert cover:", err.message);
    return null;
  });

  if (!hash) {
    res.status(500).json({ error: "Failed to save cover." });
    return;
  }

  res.json({ ok: true, contentHash: hash });
});

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

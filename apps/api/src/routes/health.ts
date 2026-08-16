import { Router } from "express";

export const healthRouter: Router = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// TEMPORARY diagnostic route — remove once the DC5 connectivity issue is
// resolved. Tests raw TCP reachability from inside this container to
// Telegram's data centers, since Render's free tier has no Shell access.
// Usage: GET /api/net-check?secret=YOUR_SYNC_SECRET
healthRouter.get("/api/net-check", async (req, res) => {
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

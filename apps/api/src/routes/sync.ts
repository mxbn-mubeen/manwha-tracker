import { Router } from "express";
import { timingSafeEqual } from "crypto";
import { SyncService } from "../modules/sync/sync.service";
import { TriggerSyncSchema } from "../modules/sync/sync.router";

export const syncRouter: Router = Router();
const syncService = new SyncService();
let syncInProgress = false;

syncRouter.post("/", async (req, res) => {
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

import 'dotenv/config';
import { timingSafeEqual } from 'crypto';
import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './root';
import { SyncService } from './modules/sync/sync.service';
import { TriggerSyncSchema } from './modules/sync/sync.router';
import { startWatcher } from './scripts/telegram-download-watcher';

const app = express();
const PORT = process.env.PORT || 3001;

// Allow the Vite frontend (port 3000) to call this API
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      // Set FRONTEND_URL to your Vercel domain in Cloud Run env vars
      // e.g. https://manwha-tracker.vercel.app
      process.env.FRONTEND_URL || '',
    ].filter(Boolean),
    credentials: true,
  })
);

app.use(express.json());

// Mount tRPC on /trpc
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req }) => ({ req }),
  })
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

app.post('/api/sync', async (req, res) => {
  const configuredSecret = process.env.SYNC_SECRET;
  if (!configuredSecret) {
    res.status(503).json({ error: 'SYNC_SECRET is not configured on this server — route disabled.' });
    return;
  }

  const providedSecret = req.header('x-sync-secret');
  const expected = Buffer.from(configuredSecret);
  const provided = Buffer.from(providedSecret ?? '');
  const isAuthorized = expected.length === provided.length && timingSafeEqual(expected, provided);

  if (!isAuthorized) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (syncInProgress) {
    res.status(409).json({ error: 'A sync is already running.' });
    return;
  }

  const parsed = TriggerSyncSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 API server running on http://localhost:${PORT}`);
  
  // Start the Telegram watcher in the background
  // This allows Render to host both the API and the Watcher in a single Free Web Service
  if (process.env.TELEGRAM_API_ID) {
    console.log('🔄 Starting Telegram watcher...');
    startWatcher().catch(err => {
      console.error('❌ Failed to start Telegram watcher:', err);
    });
  } else {
    console.log('⚠️ Skipping Telegram watcher (TELEGRAM_API_ID not set)');
  }
});

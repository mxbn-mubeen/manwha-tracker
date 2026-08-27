import './env';
import express from 'express';
import cors from 'cors';
import { timingSafeEqual } from 'crypto';

// Worker-local imports — no cross-app imports
import { SyncService } from './modules/sync/sync.service';
import { startWatcher } from './scripts/watcher';
import { poll as startBot, stopPolling } from './scripts/bot/poll';

process.on('unhandledRejection', (reason) => {
  console.error(
    '[worker] Unhandled rejection (process kept alive):',
    reason instanceof Error ? reason.stack || reason.message : reason,
  );
});
process.on('uncaughtException', (err) => {
  console.error('[worker] Uncaught exception (process kept alive):', err.stack || err.message);
});

const app = express();
const PORT = process.env.PORT || 3002;
const syncService = new SyncService();

app.use(cors({
  origin: function (origin, callback) {
    callback(null, origin || '*');
  },
  credentials: true,
}));

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'manwha-tracker-worker' });
});

app.get('/', (_req, res) => {
  res.json({
    service: 'manwha-tracker-worker',
    status: 'ok',
    message: 'Background worker — handles Telegram sync and long-running jobs.',
  });
});

// sync.run — the only tRPC-compatible route this worker exposes.
// The frontend routes sync.run to VITE_SYNC_URL (this worker) via splitLink.
// We mimic the tRPC batch response format so the client doesn't need to change.
app.post('/trpc/sync.run', async (req, res) => {
  const configuredSecret = process.env.APP_SECRET;
  if (!configuredSecret) {
    res.status(503).json([{ error: { message: 'APP_SECRET not configured.' } }]);
    return;
  }

  const providedSecret = req.header('x-app-secret') ?? '';
  const expected = Buffer.from(configuredSecret);
  const provided = Buffer.from(providedSecret);
  const isAuthorized =
    expected.length === provided.length && timingSafeEqual(expected, provided);

  if (!isAuthorized) {
    res.status(401).json([{ error: { message: 'Unauthorized' } }]);
    return;
  }

  // tRPC batch request body: { "0": { "json": { "scope": "all" } } }
  const input = req.body?.['0']?.json ?? {};
  const scope = input?.scope ?? 'all';

  try {
    const result = await syncService.run(scope);
    res.json([{ result: { data: result } }]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json([{ error: { message } }]);
  }
});

function parseEnvFlag(name: string, defaultValue: boolean) {
  const raw = process.env[name];
  if (raw == null) return defaultValue;
  return !['0', 'false', 'no'].includes(raw.trim().toLowerCase());
}

const server = app.listen(PORT, () => {
  console.log(`🚀 Worker running on http://localhost:${PORT}`);

  const enableTelegramWatcher =
    Boolean(process.env.TELEGRAM_API_ID) &&
    parseEnvFlag('START_TELEGRAM_WATCHER', true);
  const enableTelegramBot =
    Boolean(process.env.TELEGRAM_BOT_TOKEN) &&
    parseEnvFlag('START_TELEGRAM_BOT', true);

  if (enableTelegramWatcher) {
    console.log('🔄 Starting Telegram watcher...');
    startWatcher().catch((err) => {
      console.error('❌ Failed to start Telegram watcher:', err);
    });
  } else {
    console.log('⚠️ Skipping Telegram watcher (TELEGRAM_API_ID not set)');
  }

  if (enableTelegramBot) {
    console.log('🤖 Starting Telegram bot...');
    startBot().catch((err) => {
      console.error('❌ Failed to start Telegram bot:', err);
    });
  } else {
    console.log('⚠️ Skipping Telegram bot (TELEGRAM_BOT_TOKEN not set)');
  }
});

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] ${signal} received, shutting down...`);
  stopPolling();
  server.close(() => {
    console.log('[worker] HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

import './env';
import type { IncomingMessage, ServerResponse } from 'http';

// Vercel Serverless Function entry point.
// Does NOT start Telegram watcher or bot — those run on Render (apps/worker).
// Handles fast tRPC routes: manhwa, settings, sync.getHistory, sync.isSyncing.

function setCors(req: IncomingMessage, res: ServerResponse) {
  const reqOrigin = req.headers.origin as string | undefined;
  const fallbackOrigin = process.env.FRONTEND_URL || 'https://manwha-tracker-web.vercel.app';
  const origin = reqOrigin || fallbackOrigin;

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-app-secret, x-user-id, authorization, Accept, X-Requested-With',
  );
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res);

  // Fast-path: always answer CORS preflight cleanly before loading any heavy modules
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const { nodeHTTPRequestHandler } = await import('@trpc/server/adapters/node-http');
    const { appRouter } = await import('./root');
    const { createTRPCContext } = await import('./trpc');

    // Strip the /trpc prefix so tRPC sees the procedure path correctly
    const url = req.url || '/';
    req.url = url.replace(/^\/trpc/, '') || '/';

    return await nodeHTTPRequestHandler({
      req,
      res,
      router: appRouter,
      createContext: ({ req: r }) => createTRPCContext({ req: r as any }),
      batching: { enabled: true },
      path: req.url.slice(1),
    });
  } catch (err: any) {
    console.error('[vercel-handler] Error during function execution:', err);
    if (!res.headersSent) {
      setCors(req, res);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Internal Server Error',
          message: err?.message || String(err),
          missingDatabaseUrl: !process.env.DATABASE_URL,
        }),
      );
    }
  }
}

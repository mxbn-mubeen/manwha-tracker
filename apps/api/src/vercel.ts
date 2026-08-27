import './env';
import { nodeHTTPRequestHandler } from '@trpc/server/adapters/node-http';
import { appRouter } from './root';
import { createTRPCContext } from './trpc';
import type { IncomingMessage, ServerResponse } from 'http';

// Vercel Serverless Function entry point.
// Does NOT start Telegram watcher or bot — those run on Render (apps/worker).
// Handles only fast tRPC routes: manhwa, settings, sync.getHistory, sync.isSyncing.

const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').filter(Boolean);

function setCors(req: IncomingMessage, res: ServerResponse) {
  const origin = (req.headers.origin as string) || '';
  const isAllowed =
    !allowedOrigins.length || allowedOrigins.some((o) => origin.startsWith(o));
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : '');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-app-secret');
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  setCors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Strip the /trpc prefix so tRPC sees the procedure path correctly
  const url = req.url || '/';
  req.url = url.replace(/^\/trpc/, '') || '/';

  return nodeHTTPRequestHandler({
    req,
    res,
    router: appRouter,
    createContext: ({ req: r }) => createTRPCContext({ req: r as any }),
    batching: { enabled: true },
    path: req.url.slice(1),
  });
}

import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '../../../api/src/root';
import { createTRPCContext } from '../../../api/src/trpc';

export default async function handler(req: any, res: any) {
  // CORS configuration for Vercel
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-app-secret');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return createNextApiHandler({
    router: appRouter,
    createContext: createTRPCContext,
  })(req, res);
}

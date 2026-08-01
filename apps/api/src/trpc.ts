import { initTRPC, TRPCError } from '@trpc/server';
import { timingSafeEqual } from 'crypto';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Request } from 'express';

export const createTRPCContext = async (opts: { req: Request }) => {
  return { ...opts };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;

/**
 * Every procedure requires a shared secret, checked via constant-time
 * comparison (same pattern already used for the /api/sync REST route).
 * Fails closed: if APP_SECRET isn't configured, all requests are rejected
 * rather than silently allowed through — set APP_SECRET before deploying
 * anywhere reachable from outside localhost.
 */
const requireSecret = t.middleware(({ ctx, next }) => {
  const configuredSecret = process.env.APP_SECRET;
  if (!configuredSecret) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'APP_SECRET is not configured on this server — API is disabled until it is set.',
    });
  }

  const providedSecret = ctx.req.header('x-app-secret') ?? '';
  const expected = Buffer.from(configuredSecret);
  const provided = Buffer.from(providedSecret);
  const isAuthorized = expected.length === provided.length && timingSafeEqual(expected, provided);

  if (!isAuthorized) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or missing app secret.' });
  }

  return next();
});

export const publicProcedure = t.procedure.use(requireSecret);
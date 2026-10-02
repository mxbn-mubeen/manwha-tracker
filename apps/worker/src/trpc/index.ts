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
 * Every tRPC procedure on the worker requires a valid APP_SECRET header.
 * This matches the same check used by the raw sync.run Express route.
 * The previous session-cookie approach was removed because no route ever
 * issued the cookie, making every call permanently fail with 401.
 */
const requireSecret = t.middleware(({ ctx, next }) => {
  const configuredSecret = process.env.APP_SECRET;
  if (!configuredSecret) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'APP_SECRET not configured on worker.' });
  }

  const providedSecret = ctx.req.header('x-app-secret') ?? '';
  const expected = Buffer.from(configuredSecret);
  const provided = Buffer.from(providedSecret);
  const isAuthorized =

    expected.length === provided.length && timingSafeEqual(expected, provided);

  if (!isAuthorized) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or missing app secret.' });
  }

  return next();
});

export const publicProcedure = t.procedure.use(requireSecret);


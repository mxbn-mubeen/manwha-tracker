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
 * Every procedure requires a valid session cookie verified by the shared SESSION_SECRET.
 */
const requireSecret = t.middleware(({ ctx, next }) => {
  const session = ctx.req.signedCookies?.session;
  
  if (!session || session !== 'authenticated') {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or missing session cookie.' });
  }

  return next();
});

export const publicProcedure = t.procedure.use(requireSecret);

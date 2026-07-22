// Reference express types so TS doesn't complain about unportable inferred types from the backend AppRouter
import type {} from 'express';
import { createTRPCReact } from '@trpc/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../api/src/root';

export const trpc = createTRPCReact<AppRouter>();
export type RouterOutputs = inferRouterOutputs<AppRouter>;

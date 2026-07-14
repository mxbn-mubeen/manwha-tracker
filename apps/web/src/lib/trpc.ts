import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../apps/api/src/root';

export const trpc = createTRPCReact<AppRouter>();

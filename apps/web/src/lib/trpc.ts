import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../api/src/root';

export const trpc = createTRPCReact<AppRouter>();

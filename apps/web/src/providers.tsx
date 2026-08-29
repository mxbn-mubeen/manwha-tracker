import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, splitLink } from '@trpc/client';
import superjson from 'superjson';
import { trpc } from '@/lib/trpc';
import { Toaster } from 'sonner';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const SYNC_URL = (import.meta.env.VITE_SYNC_URL || 'http://localhost:3002').replace(/\/$/, '');
const APP_SECRET = import.meta.env.VITE_APP_SECRET || '';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 30 },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        splitLink({
          condition(op) {
            return op.path === 'sync.run';
          },
          true: httpBatchLink({
            url: `${SYNC_URL}/trpc`,
            transformer: superjson,
            headers: () => ({ 'x-app-secret': APP_SECRET }),
          }),
          false: httpBatchLink({
            url: `${API_URL}/trpc`,
            transformer: superjson,
            headers: () => ({ 'x-app-secret': APP_SECRET }),
          }),
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster theme="dark" position="bottom-right" />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
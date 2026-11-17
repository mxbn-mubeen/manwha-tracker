import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, splitLink } from '@trpc/client';
import superjson from 'superjson';
import { trpc } from '@/lib/trpc';
import { useSession } from '@/lib/auth-client';
import { Toaster } from 'sonner';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const SYNC_URL = (import.meta.env.VITE_SYNC_URL || 'http://localhost:3002').replace(/\/$/, '');
const APP_SECRET = import.meta.env.VITE_APP_SECRET || '';

function getAuthHeaders() {
  const userId = typeof window !== 'undefined' ? localStorage.getItem('manhwa_user_id') : null;
  const headers: Record<string, string> = { 'x-app-secret': APP_SECRET };
  if (userId) {
    headers['x-user-id'] = userId;
  }
  return headers;
}

function SessionSync() {
  const { data: session, isPending } = useSession();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (isPending) return;
    const stored = localStorage.getItem('manhwa_user_id');
    const current = session?.user?.id ?? null;
    if (current && stored !== current) {
      localStorage.setItem('manhwa_user_id', current);
      utils.manhwa.getAll.refetch();
    } else if (session === null && stored !== null) {
      localStorage.removeItem('manhwa_user_id');
      utils.manhwa.getAll.refetch();
    }
  }, [session, isPending, utils]);

  return null;
}

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
            return (
              op.path === 'sync.run' ||
              op.path === 'settings.startTelegramLogin' ||
              op.path === 'settings.verifyTelegramCode' ||
              op.path === 'settings.telegramStatus' ||
              op.path === 'settings.disconnectTelegram'
            );
          },
          true: httpBatchLink({
            url: `${SYNC_URL}/trpc`,
            transformer: superjson,
            headers: () => getAuthHeaders(),
          }),
          false: httpBatchLink({
            url: `${API_URL}/trpc`,
            transformer: superjson,
            headers: () => getAuthHeaders(),
          }),
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SessionSync />
        {children}
        <Toaster theme="dark" position="bottom-right" />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
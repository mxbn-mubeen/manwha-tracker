import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { trpc } from '@/lib/trpc';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 30 },
    },
  }));

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        httpBatchLink({
          url: `${API_URL}/trpc`,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider value={defaultSystem}>
          {children}
        </ChakraProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

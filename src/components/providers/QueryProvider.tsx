'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // PERFORMANCE: Aggressive caching for faster page loads
            staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
            gcTime: 30 * 60 * 1000, // 30 minutes - cache retention (increased from 10)
            refetchOnWindowFocus: false, // Don't refetch on window focus (reduce API calls)
            refetchOnMount: false, // Don't refetch on mount if data is fresh (PERFORMANCE BOOST)
            retry: 1, // Only retry once on failure
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
          },
          mutations: {
            // PERFORMANCE: Optimistic updates and retry logic
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}



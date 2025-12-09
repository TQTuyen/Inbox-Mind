import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode } from 'react';

// Create a client with optimal settings for email application
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      staleTime: 30 * 1000, // 30 seconds - emails update frequently

      // Cache time: how long unused data stays in cache
      gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)

      // Retry configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 401 (handled by axios interceptor)
        if (error?.response?.status === 401) return false;
        // Don't retry on 403/404
        if (error?.response?.status === 403 || error?.response?.status === 404)
          return false;
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch configuration
      refetchOnWindowFocus: true, // Refetch when user comes back to tab
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts

      // Network mode
      networkMode: 'online', // Only fetch when online
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  );
}

// Export the client for use in components if needed
export { queryClient };

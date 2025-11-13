import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(overrides = {}) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
        staleTime: 30000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
      ...overrides,
    },
  });
}

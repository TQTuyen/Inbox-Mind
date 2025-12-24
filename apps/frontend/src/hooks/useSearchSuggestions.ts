import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gmailApi, AutoSuggestionsResponse } from '@fe/services/api/gmailApi';

/**
 * Hook to fetch search suggestions as user types
 * Only enabled when query length >= 2 characters
 */
export function useSearchSuggestions(query: string, enabled = true) {
  return useQuery<AutoSuggestionsResponse>({
    queryKey: ['search-suggestions', query],
    queryFn: () => gmailApi.getSearchSuggestions({ query, limit: 5 }),
    enabled: enabled && query.length >= 2,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
  });
}

/**
 * Hook to save search history
 */
export function useSaveSearchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (query: string) => gmailApi.saveSearchHistory(query),
    onSuccess: () => {
      // Invalidate suggestions cache so they include the new history item
      queryClient.invalidateQueries({ queryKey: ['search-suggestions'] });
    },
  });
}

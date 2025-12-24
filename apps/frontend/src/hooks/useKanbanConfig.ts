import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  gmailApi,
  KanbanColumn,
  CreateKanbanColumnRequest,
  UpdateKanbanColumnRequest,
} from '@fe/services/api/gmailApi';

// Query keys
const kanbanConfigKeys = {
  all: ['kanban-config'] as const,
  config: () => [...kanbanConfigKeys.all, 'config'] as const,
};

/**
 * Hook to fetch user's Kanban configuration
 */
export function useKanbanConfig() {
  return useQuery({
    queryKey: kanbanConfigKeys.config(),
    queryFn: async () => {
      const response = await gmailApi.getKanbanConfig();
      return response.columns;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - config doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to create a new Kanban column
 */
export function useCreateKanbanColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateKanbanColumnRequest) =>
      gmailApi.createKanbanColumn(request),

    // Optimistic update
    onMutate: async (newColumn) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: kanbanConfigKeys.config() });

      // Snapshot previous value
      const previousColumns = queryClient.getQueryData<KanbanColumn[]>(
        kanbanConfigKeys.config()
      );

      // Optimistically update to the new value
      if (previousColumns) {
        const optimisticColumn: KanbanColumn = {
          columnId: newColumn.columnId || `TEMP_${Date.now()}`,
          title: newColumn.title,
          gmailLabelId: newColumn.gmailLabelId || '',
          position: previousColumns.length,
          color: newColumn.color,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData<KanbanColumn[]>(kanbanConfigKeys.config(), [
          ...previousColumns,
          optimisticColumn,
        ]);
      }

      return { previousColumns };
    },

    // Rollback on error
    onError: (err, newColumn, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(
          kanbanConfigKeys.config(),
          context.previousColumns
        );
      }
    },

    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanConfigKeys.config() });
    },
  });
}

/**
 * Hook to update an existing Kanban column
 */
export function useUpdateKanbanColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      columnId,
      request,
    }: {
      columnId: string;
      request: UpdateKanbanColumnRequest;
    }) => gmailApi.updateKanbanColumn(columnId, request),

    // Optimistic update
    onMutate: async ({ columnId, request }) => {
      await queryClient.cancelQueries({ queryKey: kanbanConfigKeys.config() });

      const previousColumns = queryClient.getQueryData<KanbanColumn[]>(
        kanbanConfigKeys.config()
      );

      if (previousColumns) {
        queryClient.setQueryData<KanbanColumn[]>(
          kanbanConfigKeys.config(),
          previousColumns.map((col) =>
            col.columnId === columnId
              ? { ...col, ...request, updatedAt: new Date().toISOString() }
              : col
          )
        );
      }

      return { previousColumns };
    },

    onError: (err, variables, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(
          kanbanConfigKeys.config(),
          context.previousColumns
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanConfigKeys.config() });
    },
  });
}

/**
 * Hook to delete a Kanban column
 */
export function useDeleteKanbanColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnId: string) => gmailApi.deleteKanbanColumn(columnId),

    // Optimistic update
    onMutate: async (columnId) => {
      await queryClient.cancelQueries({ queryKey: kanbanConfigKeys.config() });

      const previousColumns = queryClient.getQueryData<KanbanColumn[]>(
        kanbanConfigKeys.config()
      );

      if (previousColumns) {
        // Remove column and reorder positions
        const filtered = previousColumns.filter(
          (col) => col.columnId !== columnId
        );
        const reordered = filtered.map((col, index) => ({
          ...col,
          position: index,
        }));

        queryClient.setQueryData<KanbanColumn[]>(
          kanbanConfigKeys.config(),
          reordered
        );
      }

      return { previousColumns };
    },

    onError: (err, columnId, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(
          kanbanConfigKeys.config(),
          context.previousColumns
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanConfigKeys.config() });
    },
  });
}

/**
 * Hook to reorder Kanban columns
 */
export function useReorderKanbanColumns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (columnIds: string[]) =>
      gmailApi.reorderKanbanColumns(columnIds),

    // Optimistic update
    onMutate: async (columnIds) => {
      await queryClient.cancelQueries({ queryKey: kanbanConfigKeys.config() });

      const previousColumns = queryClient.getQueryData<KanbanColumn[]>(
        kanbanConfigKeys.config()
      );

      if (previousColumns) {
        // Create a map for quick lookup
        const columnMap = new Map(
          previousColumns.map((col) => [col.columnId, col])
        );

        // Reorder based on columnIds array
        const reordered = columnIds
          .map((id, index) => {
            const col = columnMap.get(id);
            return col ? { ...col, position: index } : null;
          })
          .filter((col): col is KanbanColumn => col !== null);

        queryClient.setQueryData<KanbanColumn[]>(
          kanbanConfigKeys.config(),
          reordered
        );
      }

      return { previousColumns };
    },

    onError: (err, columnIds, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(
          kanbanConfigKeys.config(),
          context.previousColumns
        );
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kanbanConfigKeys.config() });
    },
  });
}

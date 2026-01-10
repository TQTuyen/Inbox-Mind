import { useEffect } from 'react';
import { useKanbanEmails } from '@fe/hooks/useGmailQuery';
import { useKanbanConfig } from '@fe/hooks/useKanbanConfig';
import { useKanbanStore } from '../store/kanbanStore';

/**
 * Custom hook that fetches Kanban emails and manages Kanban board state
 * Uses dedicated /api/kanban/emails endpoint to fetch from all Kanban labels
 * Also loads dynamic column configuration from the backend
 */
export function useKanban() {
  // Use selectors to prevent unnecessary re-renders
  const initializeColumns = useKanbanStore((state) => state.initializeColumns);
  const setLoading = useKanbanStore((state) => state.setLoading);
  const setError = useKanbanStore((state) => state.setError);
  const setColumnConfig = useKanbanStore((state) => state.setColumnConfig);
  const moveEmail = useKanbanStore((state) => state.moveEmail);

  // Fetch dynamic column configuration
  const { data: columnConfig = [], isLoading: isConfigLoading } =
    useKanbanConfig();

  // Fetch all Kanban emails (INBOX, TODO, IN_PROGRESS, DONE) in one call
  const {
    data: emails = [],
    isLoading: isEmailsLoading,
    error,
    refetch,
  } = useKanbanEmails();

  // Store column config in zustand
  useEffect(() => {
    if (columnConfig.length > 0) {
      setColumnConfig(columnConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnConfig]);

  // Initialize kanban columns when both config and emails are loaded
  useEffect(() => {
    console.log('🔍 [useKanban] useEffect triggered:', {
      configLength: columnConfig.length,
      emailsLength: emails.length,
      emailsSample: emails.slice(0, 3).map((e) => ({
        id: e.id?.slice(0, 8),
        kanbanStatus: e.kanbanStatus,
      })),
    });

    if (columnConfig.length > 0 && emails.length >= 0) {
      initializeColumns(emails, columnConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails, columnConfig]);

  // Sync loading state (true if either emails or config are loading)
  useEffect(() => {
    setLoading(isEmailsLoading || isConfigLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmailsLoading, isConfigLoading]);

  // Sync error state
  useEffect(() => {
    if (error) {
      setError(error.message || 'Failed to load Kanban emails');
    } else {
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Handle moving emails between columns (updates backend)
  const handleMoveEmail = async (
    emailId: string,
    fromColumnId: string,
    toColumnId: string
  ) => {
    // The moveEmail action handles optimistic updates and API calls
    await moveEmail(emailId, fromColumnId, toColumnId);
  };

  return {
    emails,
    loading: isEmailsLoading || isConfigLoading,
    error: error?.message || null,
    refetch,
    handleMoveEmail,
  };
}

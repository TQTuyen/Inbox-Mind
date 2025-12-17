import { useEffect } from 'react';
import { useKanbanEmails } from '@fe/hooks/useGmailQuery';
import { useKanbanStore } from '../store/kanbanStore';

/**
 * Custom hook that fetches Kanban emails and manages Kanban board state
 * Uses dedicated /api/kanban/emails endpoint to fetch from all Kanban labels
 */
export function useKanban() {
  const { initializeColumns, setLoading, setError, moveEmail } =
    useKanbanStore();

  // Fetch all Kanban emails (INBOX, TODO, IN_PROGRESS, DONE) in one call
  const {
    data: emails = [],
    isLoading,
    error,
    refetch,
  } = useKanbanEmails();

  // Initialize kanban columns when emails are loaded
  useEffect(() => {
    if (emails.length > 0) {
      initializeColumns(emails);
    }
  }, [emails, initializeColumns]);

  // Sync loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  // Sync error state
  useEffect(() => {
    if (error) {
      setError(error.message || 'Failed to load Kanban emails');
    } else {
      setError(null);
    }
  }, [error, setError]);

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
    loading: isLoading,
    error: error?.message || null,
    refetch,
    handleMoveEmail,
  };
}

import { useEffect, useRef, useMemo } from 'react';
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

  // Track if we've initialized to prevent infinite loops
  const hasInitialized = useRef(false);
  const prevEmailsLength = useRef(-1);
  const prevConfigLength = useRef(-1);

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

  // Memoize non-snoozed emails to prevent unnecessary recalculations
  const nonSnoozedEmails = useMemo(() => {
    return emails.filter((email) => email.kanbanStatus !== 'snoozed');
  }, [emails]);

  // Store column config in zustand - only when config actually changes
  useEffect(() => {
    if (
      columnConfig.length > 0 &&
      columnConfig.length !== prevConfigLength.current
    ) {
      prevConfigLength.current = columnConfig.length;
      setColumnConfig(columnConfig);
    }
  }, [columnConfig, setColumnConfig]);

  // Initialize kanban columns when both config and emails are loaded
  // Only re-initialize when data actually changes
  useEffect(() => {
    const emailsChanged = nonSnoozedEmails.length !== prevEmailsLength.current;
    const configReady = columnConfig.length > 0;

    if (configReady && (emailsChanged || !hasInitialized.current)) {
      prevEmailsLength.current = nonSnoozedEmails.length;
      hasInitialized.current = true;
      initializeColumns(nonSnoozedEmails, columnConfig);
    }
  }, [nonSnoozedEmails, columnConfig, initializeColumns]);

  // Sync loading state (true if either emails or config are loading)
  useEffect(() => {
    setLoading(isEmailsLoading || isConfigLoading);
  }, [isEmailsLoading, isConfigLoading, setLoading]);

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
    loading: isEmailsLoading || isConfigLoading,
    error: error?.message || null,
    refetch,
    handleMoveEmail,
  };
}

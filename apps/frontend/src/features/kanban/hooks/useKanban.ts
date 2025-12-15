import { useEffect } from 'react';
import { useMailbox } from '../../mailbox/hooks/useMailbox';
import { useEmailStore } from '../../mailbox/store/emailStore';
import { useKanbanStore } from '../store/kanbanStore';

/**
 * Custom hook that integrates mailbox data with kanban board
 * Syncs emails from useMailbox to Kanban columns
 */
export function useKanban() {
  const { emails, loading } = useEmailStore();
  const { initializeColumns, setLoading, moveEmail } = useKanbanStore();

  // Use existing mailbox hook for data fetching
  const mailboxHook = useMailbox();

  // Initialize kanban columns when emails change
  useEffect(() => {
    if (emails.length > 0) {
      initializeColumns(emails);
    }
  }, [emails, initializeColumns]);

  // Sync loading state
  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  // Handle moving emails between columns (updates backend)
  const handleMoveEmail = async (
    emailId: string,
    fromColumnId: string,
    toColumnId: string
  ) => {
    // Optimistically update UI
    moveEmail(emailId, fromColumnId, toColumnId);

    // TODO: Call API to update email labels
    // This would modify the email's labels in Gmail
    // Example:
    // try {
    //   await gmailApi.modifyLabels(emailId, {
    //     addLabelIds: [toColumnLabelId],
    //     removeLabelIds: [fromColumnLabelId]
    //   });
    // } catch (error) {
    //   // Revert optimistic update on error
    //   moveEmail(emailId, toColumnId, fromColumnId);
    //   toast.error('Failed to move email');
    // }
  };

  return {
    ...mailboxHook,
    handleMoveEmail,
  };
}

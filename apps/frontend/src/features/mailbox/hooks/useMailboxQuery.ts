/**
 * Custom hook for mailbox operations using TanStack Query
 * Replaces Zustand-based data fetching with React Query patterns
 */

import {
  useArchiveEmail,
  useDeleteEmail,
  useEmails,
  useMailboxes,
  useMarkAsRead,
  useToggleStar,
} from '@fe/hooks/useGmailQuery';
import { Email as ApiEmail } from '@fe/services/api/gmailApi';
import { useCallback, useState } from 'react';
import { useEmailStore } from '../store/emailStore';

export const useMailboxQuery = () => {
  const {
    selectedMailboxId,
    setSelectedMailbox,
    selectedEmail,
    setSelectedEmail,
  } = useEmailStore();

  const [pageSize] = useState(20);

  // Fetch mailboxes using React Query
  const {
    data: mailboxes = [],
    isLoading: isLoadingMailboxes,
    error: mailboxesError,
    refetch: refetchMailboxes,
  } = useMailboxes({
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch emails for selected mailbox
  const {
    data: emailsData,
    isLoading: isLoadingEmails,
    error: emailsError,
    refetch: refetchEmails,
  } = useEmails(selectedMailboxId || 'INBOX', pageSize, {
    enabled: !!selectedMailboxId,
  });

  // Mutations
  const markAsReadMutation = useMarkAsRead();
  const toggleStarMutation = useToggleStar();
  const deleteEmailMutation = useDeleteEmail();
  const archiveEmailMutation = useArchiveEmail();

  // Handle email selection
  const handleEmailSelect = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (email: ApiEmail | any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSelectedEmail(email as any);

      // Mark as read if unread
      if (!email.isRead) {
        try {
          await markAsReadMutation.mutateAsync({
            emailId: email.id,
            read: true,
          });
        } catch (error) {
          console.error('Failed to mark email as read:', error);
        }
      }
    },
    [setSelectedEmail, markAsReadMutation]
  );

  // Handle toggle star
  const handleToggleStar = useCallback(
    async (emailId: string, isStarred: boolean) => {
      try {
        await toggleStarMutation.mutateAsync({ emailId, isStarred });
      } catch (error) {
        console.error('Failed to toggle star:', error);
      }
    },
    [toggleStarMutation]
  );

  // Handle delete email
  const handleDeleteEmail = useCallback(
    async (emailId: string) => {
      try {
        await deleteEmailMutation.mutateAsync(emailId);
        setSelectedEmail(null);
      } catch (error) {
        console.error('Failed to delete email:', error);
      }
    },
    [deleteEmailMutation, setSelectedEmail]
  );

  // Handle archive email
  const handleArchiveEmail = useCallback(
    async (emailId: string) => {
      try {
        await archiveEmailMutation.mutateAsync(emailId);
        setSelectedEmail(null);
      } catch (error) {
        console.error('Failed to archive email:', error);
      }
    },
    [archiveEmailMutation, setSelectedEmail]
  );

  // Handle mailbox selection
  const handleSelectMailbox = useCallback(
    (mailboxId: string) => {
      setSelectedMailbox(mailboxId);
      setSelectedEmail(null);
    },
    [setSelectedMailbox, setSelectedEmail]
  );

  // Refresh emails
  const refreshEmails = useCallback(() => {
    refetchEmails();
    refetchMailboxes();
  }, [refetchEmails, refetchMailboxes]);

  return {
    // Data
    mailboxes,
    emails: emailsData?.emails || [],
    selectedEmail,
    selectedMailboxId,

    // Loading states
    isLoading: isLoadingMailboxes || isLoadingEmails,
    isLoadingMailboxes,
    isLoadingEmails,

    // Error states
    error: mailboxesError || emailsError,
    mailboxesError,
    emailsError,

    // Actions
    handleEmailSelect,
    handleToggleStar,
    handleDeleteEmail,
    handleArchiveEmail,
    handleSelectMailbox,
    refreshEmails,

    // Mutation states
    isDeletingEmail: deleteEmailMutation.isPending,
    isArchivingEmail: archiveEmailMutation.isPending,
    isTogglingRead: markAsReadMutation.isPending,
    isTogglingStar: toggleStarMutation.isPending,
  };
};

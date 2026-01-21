/**
 * Custom hook for mailbox business logic using TanStack Query
 * Handles email operations, mailbox selection, and state management
 * Refactored to use React Query for data fetching and caching
 *
 * DYNAMIC FILTERING IMPLEMENTATION:
 * ================================
 * This hook implements dynamic email list filtering based on selected mailbox/label.
 *
 * Flow:
 * 1. URL Parameter → Store Sync:
 *    - MailboxPage reads mailboxId from URL params (e.g., /inbox/SENT)
 *    - Syncs mailboxId to Zustand store via setSelectedMailbox()
 *
 * 2. Data Fetching:
 *    - useEmails() React Query hook fetches emails filtered by selectedMailboxId
 *    - Query automatically refetches when selectedMailboxId changes
 *
 * 3. Store Synchronization:
 *    - useEffect syncs React Query data (emailsData) to Zustand store
 *    - Transforms API Email type to store Email type
 *    - EmailList component reads from Zustand store for consistent UI state
 *
 * 4. Navigation:
 *    - Sidebar component uses React Router navigate() to change mailbox
 *    - Clicking mailbox navigates to /inbox/:mailboxId
 *    - URL change triggers steps 1-3 above
 *
 * Benefits:
 * - URL reflects current mailbox (shareable links, browser back/forward)
 * - React Query handles caching, deduplication, and background refetching
 * - Zustand provides synchronous state access for components
 * - Separation of concerns: fetching (React Query) vs UI state (Zustand)
 */

import {
  useArchiveEmail,
  useDeleteEmail,
  useInfiniteEmails,
  useMailboxes,
  useMarkAsRead,
  useToggleStar,
} from '@fe/hooks/useGmailQuery';
import {
  Email as ApiEmail,
  EmailListResponse,
  gmailApi,
} from '@fe/services/api/gmailApi';
import { InfiniteData } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { Email, useEmailStore } from '../store/emailStore';

export const useMailbox = () => {
  const {
    selectedMailboxId,
    setSelectedMailbox,
    selectedEmail,
    setSelectedEmail,
    currentPage,
    searchKeyword,
    selectedCategory,
    setMailboxes,
    setEmails,
    setLoading,
  } = useEmailStore();

  // Fetch mailboxes using React Query
  const {
    data: mailboxesData = [],
    isLoading: isLoadingMailboxes,
    error: mailboxesError,
    refetch: refetchMailboxes,
  } = useMailboxes({
    staleTime: 5 * 60 * 1000, // Mailboxes don't change often
  });

  // Sync mailboxes from React Query to Zustand store
  useEffect(() => {
    if (mailboxesData && mailboxesData.length > 0) {
      // Transform API Mailbox type to store Mailbox type
      const transformedMailboxes = mailboxesData.map((mailbox) => ({
        id: mailbox.id,
        name: mailbox.name,
        unreadCount: mailbox.unreadCount || 0,
      }));

      setMailboxes(transformedMailboxes);

      // Set default mailbox to INBOX if none selected
      if (!selectedMailboxId) {
        const inboxMailbox = mailboxesData.find((m) => m.id === 'INBOX');
        if (inboxMailbox) {
          setSelectedMailbox('INBOX');
        } else if (mailboxesData[0]) {
          // Fallback to first mailbox if INBOX not found
          setSelectedMailbox(mailboxesData[0].id);
        }
      }
    }
  }, [mailboxesData, selectedMailboxId, setMailboxes, setSelectedMailbox]);

  // Fetch emails for selected mailbox using React Query with infinite scroll
  const {
    data: emailsInfiniteData,
    isLoading: isLoadingEmails,
    error: emailsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchEmails,
  } = useInfiniteEmails(selectedMailboxId || 'INBOX', 20, {
    enabled: !!selectedMailboxId,
  });

  /**
   * Sync React Query infinite emails data to Zustand store
   *
   * This is the key integration point between React Query and Zustand:
   * - React Query manages server state and caching with infinite scroll
   * - Zustand provides synchronous UI state for components
   *
   * Runs whenever:
   * - emailsInfiniteData changes (new page fetched)
   * - selectedMailboxId changes (different mailbox selected)
   * - isLoadingEmails changes (loading state updated)
   */
  useEffect(() => {
    const infiniteData = emailsInfiniteData as
      | InfiniteData<EmailListResponse>
      | undefined;

    if (infiniteData?.pages) {
      // Flatten all pages into a single array and transform
      const allEmails = infiniteData.pages.flatMap((page) => page.emails);

      const transformedEmails: Email[] = allEmails.map((email) => ({
        id: email.id,
        from: email.from,
        to: email.to,
        cc: email.cc,
        subject: email.subject,
        preview: email.preview,
        body: email.body,
        timestamp: email.timestamp,
        isRead: email.isRead,
        isStarred: email.isStarred,
        attachments: email.attachments,
        mailboxId: selectedMailboxId || 'INBOX',
        kanbanStatus: email.kanbanStatus || 'inbox',
        snoozeUntil: email.snoozeUntil,
        summary: email.summary,
      }));

      // For infinite scroll, we always have 1 "page" conceptually
      // The actual pagination is handled by fetchNextPage
      const totalPages = hasNextPage ? 2 : 1;

      setEmails(transformedEmails, totalPages);
    } else if (!isLoadingEmails) {
      // If no data and not loading, set empty array
      setEmails([], 1);
    }
  }, [
    emailsInfiniteData,
    isLoadingEmails,
    selectedMailboxId,
    setEmails,
    hasNextPage,
  ]);

  // Sync loading state to Zustand
  useEffect(() => {
    setLoading(isLoadingEmails || isLoadingMailboxes);
  }, [isLoadingEmails, isLoadingMailboxes, setLoading]);

  // Mutations
  const markAsReadMutation = useMarkAsRead();
  const toggleStarMutation = useToggleStar();
  const deleteEmailMutation = useDeleteEmail();
  const archiveEmailMutation = useArchiveEmail();

  // Handle email selection with automatic mark as read
  const handleEmailSelect = useCallback(
    async (email: ApiEmail) => {
      // Set email immediately for quick feedback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSelectedEmail(email as any);

      // Preserve existing metadata (summary, kanbanStatus, snoozeUntil) before fetching
      const existingMetadata = {
        summary: (email as any).summary,
        kanbanStatus: (email as any).kanbanStatus,
        snoozeUntil: (email as any).snoozeUntil,
      };

      // Fetch full email data (with attachments) in background
      try {
        const fullEmail = await gmailApi.getEmailById(email.id);
        // Merge full email with preserved metadata to avoid losing generated summary
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setSelectedEmail({
          ...fullEmail,
          ...existingMetadata,
        } as any);
      } catch (error) {
        console.error('Failed to fetch full email:', error);
        // Keep the partial email data if fetch fails
      }

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
        throw error;
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
        throw error;
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
        throw error;
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

  // Refresh all data
  const refreshEmails = useCallback(() => {
    refetchEmails();
    refetchMailboxes();
  }, [refetchEmails, refetchMailboxes]);

  return {
    // Data from React Query
    mailboxes: mailboxesData,
    emails:
      (
        emailsInfiniteData as InfiniteData<EmailListResponse> | undefined
      )?.pages.flatMap((page) => page.emails) || [],
    selectedEmail,
    selectedMailboxId,

    // Loading states
    isLoading: isLoadingMailboxes || isLoadingEmails,
    isLoadingMailboxes,
    isLoadingEmails,
    isFetchingNextPage,

    // Error states
    error: mailboxesError || emailsError,
    mailboxesError,
    emailsError,

    // Zustand state (for filters, pagination, etc.)
    currentPage,
    searchKeyword,
    selectedCategory,

    // Actions
    handleEmailSelect,
    handleToggleStar,
    handleDeleteEmail,
    handleArchiveEmail,
    handleSelectMailbox,
    refreshEmails,

    // Mutation loading states
    isDeletingEmail: deleteEmailMutation.isPending,
    isArchivingEmail: archiveEmailMutation.isPending,
    isTogglingRead: markAsReadMutation.isPending,
    isTogglingStar: toggleStarMutation.isPending,

    // Infinite scroll
    fetchNextPage,
    hasNextPage,
  };
};

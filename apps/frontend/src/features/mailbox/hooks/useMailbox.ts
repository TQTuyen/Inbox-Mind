/**
 * Custom hook for mailbox business logic
 * Handles email operations, mailbox selection, and state management
 */

import { useEffect, useCallback } from 'react';
import { useEmailStore } from '../store/emailStore';
import { emailService } from '@fe/services/emailService';

export const useMailbox = () => {
  const {
    selectedMailboxId,
    setEmails,
    setSelectedEmail,
    selectedEmail,
    currentPage,
    searchKeyword,
    selectedCategory,
    setMailboxes,
    setLoading,
    setError,
    updateEmail,
  } = useEmailStore();

  // Fetch mailboxes on mount
  useEffect(() => {
    const fetchMailboxes = async () => {
      try {
        const mailboxes = await emailService.getMailboxes();
        setMailboxes(mailboxes);
      } catch (error) {
        console.error('Failed to fetch mailboxes:', error);
        setError('Failed to load mailboxes');
      }
    };

    fetchMailboxes();
  }, [setMailboxes, setError]);

  // Fetch emails when dependencies change
  const fetchEmails = useCallback(async () => {
    if (!selectedMailboxId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await emailService.getEmails(
        selectedMailboxId,
        currentPage,
        20,
        searchKeyword,
        selectedCategory
      );
      setEmails(response.emails, response.totalPages);
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      setError('Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [selectedMailboxId, currentPage, searchKeyword, selectedCategory, setEmails, setLoading, setError]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Handle email selection
  const handleEmailSelect = useCallback(async (email: any) => {
    setSelectedEmail(email);
    
    if (!email.isRead) {
      try {
        await emailService.markAsRead(email.id);
        updateEmail(email.id, { isRead: true });
      } catch (error) {
        console.error('Failed to mark email as read:', error);
      }
    }
  }, [setSelectedEmail, updateEmail]);

  // Handle email actions
  const handleToggleStar = useCallback(async (emailId: string, isStarred: boolean) => {
    try {
      await emailService.toggleStar(emailId, !isStarred);
      updateEmail(emailId, { isStarred: !isStarred });
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  }, [updateEmail]);

  const handleDeleteEmail = useCallback(async (emailId: string) => {
    try {
      await emailService.deleteEmail(emailId);
      setSelectedEmail(null);
      fetchEmails();
    } catch (error) {
      console.error('Failed to delete email:', error);
    }
  }, [setSelectedEmail, fetchEmails]);

  const handleArchiveEmail = useCallback(async (emailId: string) => {
    try {
      await emailService.moveToMailbox(emailId, 'archive');
      setSelectedEmail(null);
      fetchEmails();
    } catch (error) {
      console.error('Failed to archive email:', error);
    }
  }, [setSelectedEmail, fetchEmails]);

  return {
    selectedEmail,
    handleEmailSelect,
    handleToggleStar,
    handleDeleteEmail,
    handleArchiveEmail,
    refreshEmails: fetchEmails,
  };
};

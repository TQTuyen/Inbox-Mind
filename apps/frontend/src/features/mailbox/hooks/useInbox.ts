import { emailService } from '@fe/services/emailService';
import { useEmailStore } from '@fe/features/mailbox/store/emailStore';
import { useEffect, useState } from 'react';

export function useInbox() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const {
    selectedMailboxId,
    setEmails,
    setSelectedEmail,
    currentPage,
    searchKeyword,
    selectedCategory,
    setMailboxes,
    setLoading,
    setError,
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
  useEffect(() => {
    const fetchEmails = async () => {
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
    };

    fetchEmails();
  }, [
    selectedMailboxId,
    currentPage,
    searchKeyword,
    selectedCategory,
    setEmails,
    setLoading,
    setError,
  ]);

  // Fetch email details when an email is selected
  const handleEmailSelect = async (email: any) => {
    setSelectedEmail(email);

    if (!email.isRead) {
      try {
        await emailService.markAsRead(email.id);
      } catch (error) {
        console.error('Failed to mark email as read:', error);
      }
    }
  };

  const handleSearchChange = (query: string) => {
    useEmailStore.getState().setSearchKeyword(query);
  };

  return {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    handleEmailSelect,
    handleSearchChange,
    searchKeyword,
  };
}

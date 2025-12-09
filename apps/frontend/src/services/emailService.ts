import { Email, Mailbox } from '../features/mailbox/store/emailStore';
import {
  Email as ApiEmail,
  Mailbox as ApiMailbox,
  gmailApi,
} from './api/gmailApi';

interface EmailListResponse {
  emails: Email[];
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

/**
 * Legacy email service for backward compatibility
 * This wraps the new gmailApi to maintain existing interfaces
 * @deprecated Use gmailApi and useGmailQuery hooks instead
 */
export const emailService = {
  async getMailboxes(): Promise<Mailbox[]> {
    const mailboxes = await gmailApi.getMailboxes();
    return mailboxes.map(transformMailbox);
  },

  async getEmails(
    mailboxId: string,
    page: number,
    limit: number,
    search?: string,
    category?: string
  ): Promise<EmailListResponse> {
    const response = await gmailApi.getEmails({
      mailboxId,
      pageSize: limit,
    });

    // Transform and filter emails based on search and category
    let emails = response.emails.map(transformEmail);

    if (search) {
      const searchLower = search.toLowerCase();
      emails = emails.filter(
        (email) =>
          email.subject.toLowerCase().includes(searchLower) ||
          email.from.name.toLowerCase().includes(searchLower) ||
          email.from.email.toLowerCase().includes(searchLower) ||
          email.preview.toLowerCase().includes(searchLower)
      );
    }

    if (category && category !== 'all') {
      emails = emails.filter((email) => {
        switch (category) {
          case 'unread':
            return !email.isRead;
          case 'starred':
            return email.isStarred;
          case 'attachments':
            return email.attachments && email.attachments.length > 0;
          default:
            return true;
        }
      });
    }

    // Calculate pagination
    const totalCount = emails.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEmails = emails.slice(startIndex, endIndex);

    return {
      emails: paginatedEmails,
      page,
      limit,
      totalPages,
      totalCount,
    };
  },

  async getEmailById(id: string): Promise<Email> {
    const email = await gmailApi.getEmailById(id);
    return transformEmail(email);
  },

  async markAsRead(id: string): Promise<void> {
    await gmailApi.markAsRead(id, true);
  },

  async markAsUnread(id: string): Promise<void> {
    await gmailApi.markAsRead(id, false);
  },

  async toggleStar(id: string, isStarred: boolean): Promise<void> {
    await gmailApi.toggleStar(id, isStarred);
  },

  async deleteEmail(id: string): Promise<void> {
    await gmailApi.deleteEmail(id);
  },

  async moveToMailbox(id: string, mailboxId: string): Promise<void> {
    await gmailApi.moveToMailbox(id, mailboxId);
  },

  async addNote(id: string, note: string): Promise<void> {
    // Note: This functionality may need to be implemented on the backend
    // For now, this is a placeholder
    console.warn('addNote not yet implemented in Gmail API');
  },
};

/**
 * Transform API Email to Zustand Email format
 */
function transformEmail(apiEmail: ApiEmail): Email {
  return {
    id: apiEmail.id,
    from: apiEmail.from,
    to: apiEmail.to,
    cc: apiEmail.cc,
    subject: apiEmail.subject,
    preview: apiEmail.preview,
    body: apiEmail.body,
    timestamp: apiEmail.timestamp,
    isRead: apiEmail.isRead,
    isStarred: apiEmail.isStarred,
    attachments: apiEmail.attachments,
    mailboxId: extractMailboxId(apiEmail.labelIds),
    note: undefined, // Notes not yet supported
  };
}

/**
 * Transform API Mailbox to Zustand Mailbox format
 */
function transformMailbox(apiMailbox: ApiMailbox): Mailbox {
  return {
    id: apiMailbox.id,
    name: apiMailbox.name,
    unreadCount: apiMailbox.unreadCount || 0,
  };
}

/**
 * Extract primary mailbox ID from label IDs
 */
function extractMailboxId(labelIds?: string[]): string {
  if (!labelIds || labelIds.length === 0) return 'inbox';

  // Priority order for determining mailbox
  const priorities = ['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM'];

  for (const priority of priorities) {
    if (labelIds.includes(priority)) {
      return priority.toLowerCase();
    }
  }

  // If no standard label found, use the first label
  return labelIds[0]?.toLowerCase() || 'inbox';
}

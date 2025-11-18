import { Email, Mailbox } from '../features/mailbox/store/emailStore';
import api from '../lib/api/api';

interface EmailListResponse {
  emails: Email[];
  page: number;
  limit: number;
  totalPages: number;
  totalCount: number;
}

export const emailService = {
  async getMailboxes(): Promise<Mailbox[]> {
    const response = await api.get('/mailboxes');
    console.log('Mailboxes response:', response.data);
    return response.data;
  },

  async getEmails(
    mailboxId: string,
    page: number,
    limit: number,
    search?: string,
    category?: string
  ): Promise<EmailListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    if (category && category !== 'all') {
      params.append('category', category);
    }

    const response = await api.get(
      `/mailboxes/${mailboxId}/emails?${params.toString()}`
    );
    return response.data;
  },

  async getEmailById(id: string): Promise<Email> {
    const response = await api.get(`/emails/${id}`);
    return response.data;
  },

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/emails/${id}`, { isRead: true });
  },

  async markAsUnread(id: string): Promise<void> {
    await api.patch(`/emails/${id}`, { isRead: false });
  },

  async toggleStar(id: string, isStarred: boolean): Promise<void> {
    await api.patch(`/emails/${id}`, { isStarred });
  },

  async deleteEmail(id: string): Promise<void> {
    await api.delete(`/emails/${id}`);
  },

  async moveToMailbox(id: string, mailboxId: string): Promise<void> {
    await api.patch(`/emails/${id}`, { mailboxId });
  },

  async addNote(id: string, note: string): Promise<void> {
    await api.patch(`/emails/${id}`, { note });
  },
};

import api from '@fe/lib/api/api';
import { transformGmailLabel, transformGmailMessage } from './transformers';

// ==================== Types ====================

export interface EmailAddress {
  name: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  partId?: string;
}

export interface Email {
  id: string;
  threadId?: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  preview: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  attachments?: EmailAttachment[];
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  mailboxId?: string;
  kanbanStatus?: 'inbox' | 'todo' | 'in_progress' | 'done' | 'snoozed';
  snoozeUntil?: string | null;
  summary?: string | null;
  note?: string | null;
}

export interface Mailbox {
  id: string;
  name: string;
  unreadCount?: number;
  type?: string;
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
}

export interface EmailListResponse {
  emails: Email[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface MailboxListResponse {
  labels: Mailbox[];
}

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
}

export interface ReplyEmailRequest {
  body: string;
  cc?: string;
  bcc?: string;
}

export interface ModifyLabelsRequest {
  action: 'add' | 'remove';
  labelIds: string[];
}

export interface MarkReadRequest {
  read: boolean;
}

export interface FuzzySearchResult {
  id: string;
  subject: string;
  from: EmailAddress;
  snippet: string;
  timestamp: string;
  isRead: boolean;
  hasAttachments: boolean;
  score: number;
  matchedFields: string[];
}

export interface FuzzySearchResponse {
  results: FuzzySearchResult[];
  total: number;
  query: string;
}

export interface SemanticSearchResult {
  emailId: string;
  similarity: number;
  subject: string;
  preview: string;
  from: EmailAddress;
  timestamp: string;
  isRead: boolean;
}

export interface SemanticSearchResponse {
  results: SemanticSearchResult[];
  total: number;
  query: string;
}

export type SuggestionType = 'contact' | 'keyword' | 'semantic' | 'history';

export interface SearchSuggestion {
  text: string;
  type: SuggestionType;
  metadata?: Record<string, unknown>;
}

export interface AutoSuggestionsResponse {
  suggestions: SearchSuggestion[];
  query: string;
}

export interface KanbanColumn {
  columnId: string;
  title: string;
  gmailLabelId: string;
  position: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanConfigResponse {
  columns: KanbanColumn[];
}

export interface CreateKanbanColumnRequest {
  title: string;
  columnId?: string;
  gmailLabelId?: string;
  color?: string;
}

export interface UpdateKanbanColumnRequest {
  title?: string;
  updateGmailLabel?: boolean;
  color?: string;
}

export interface DownloadAttachmentResponse {
  data: Blob;
  filename: string;
  mimeType: string;
  size: number;
}

export interface ThreadMessage {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  attachments?: EmailAttachment[];
}

export interface Thread {
  id: string;
  messages: ThreadMessage[];
  snippet: string;
  historyId: string;
  participants: EmailAddress[];
  subject: string;
  messageCount: number;
  unreadCount: number;
  hasAttachments: boolean;
  labelIds: string[];
}

export interface ThreadListResponse {
  threads: Thread[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

// ==================== API Service ====================

class GmailApiService {
  /**
   * List all mailboxes (labels)
   */
  async getMailboxes(): Promise<Mailbox[]> {
    const response = await api.get<any[]>('/mailboxes');
    return response.data.map(transformGmailLabel);
  }

  /**
   * List emails in a specific mailbox with pagination
   */
  async getEmails(params: {
    mailboxId: string;
    page?: string;
    pageSize?: number;
  }): Promise<EmailListResponse> {
    const { mailboxId, page, pageSize = 20 } = params;

    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page);
    queryParams.append('pageSize', pageSize.toString());

    const url = `/mailboxes/${mailboxId}/emails${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    const response = await api.get<any>(url);

    // Transform Gmail API response to frontend format
    return {
      emails: response.data.emails?.map(transformGmailMessage) || [],
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate,
    };
  }

  /**
   * Get all emails for Kanban board (INBOX, TODO, IN_PROGRESS, DONE)
   */
  async getKanbanEmails(): Promise<Email[]> {
    console.log('🌐 [API] Calling /kanban/emails endpoint...');
    const response = await api.get<any>('/kanban/emails');

    console.log('🌐 [API] Response received:', {
      status: response.status,
      hasData: !!response.data,
      dataKeys: Object.keys(response.data || {}),
      emailsCount: response.data.emails?.length || 0,
      sampleEmail: response.data.emails?.[0] ? {
        id: response.data.emails[0].id?.slice(0, 8),
        kanbanStatus: response.data.emails[0].kanbanStatus,
        subject: response.data.emails[0].subject?.slice(0, 30),
      } : null,
    });

    const emails = response.data.emails?.map(transformGmailMessage) || [];

    console.log('🌐 [API] After transformation:', {
      transformedCount: emails.length,
      sampleTransformed: emails[0] ? {
        id: emails[0].id?.slice(0, 8),
        kanbanStatus: emails[0].kanbanStatus,
        subject: emails[0].subject?.slice(0, 30),
      } : null,
    });

    return emails;
  }

  /**
   * Get a single email by ID
   */
  async getEmailById(emailId: string): Promise<Email> {
    const response = await api.get<any>(`/emails/${emailId}`);
    return transformGmailMessage(response.data);
  }

  /**
   * Mark an email as read or unread
   */
  async markAsRead(emailId: string, read: boolean): Promise<void> {
    await api.put(`/emails/${emailId}/read`, { read });
  }

  /**
   * Toggle star status on an email
   */
  async toggleStar(emailId: string, isStarred: boolean): Promise<void> {
    await api.post(`/emails/${emailId}/labels`, {
      action: isStarred ? 'add' : 'remove',
      labelIds: ['STARRED'],
    });
  }

  /**
   * Modify labels on an email
   */
  async modifyLabels(
    emailId: string,
    request: ModifyLabelsRequest
  ): Promise<void> {
    await api.post(`/emails/${emailId}/labels`, request);
  }

  /**
   * Delete an email (move to trash)
   */
  async deleteEmail(emailId: string): Promise<void> {
    await api.delete(`/emails/${emailId}`);
  }

  /**
   * Move email to a specific mailbox/label
   */
  async moveToMailbox(emailId: string, mailboxId: string): Promise<void> {
    // Moving in Gmail means adding the new label and removing the old ones
    // This is a simplified version - you may need to adjust based on backend implementation
    await api.post(`/emails/${emailId}/labels`, {
      action: 'add',
      labelIds: [mailboxId],
    });
  }

  /**
   * Update Kanban status in database
   */
  async updateKanbanStatus(
    emailId: string,
    kanbanStatus: 'inbox' | 'todo' | 'in_progress' | 'done'
  ): Promise<void> {
    await api.put(`/email-metadata/${emailId}/kanban-status`, {
      kanbanStatus,
    });
  }

  /**
   * Archive an email (remove INBOX label)
   */
  async archiveEmail(emailId: string): Promise<void> {
    await api.post(`/emails/${emailId}/labels`, {
      action: 'remove',
      labelIds: ['INBOX'],
    });
  }

  /**
   * Send a new email
   */
  async sendEmail(request: SendEmailRequest): Promise<{ id: string }> {
    const response = await api.post<{ id: string }>('/emails/send', request);
    return response.data;
  }

  /**
   * Reply to an email
   */
  async replyToEmail(
    emailId: string,
    request: ReplyEmailRequest
  ): Promise<{ id: string }> {
    const response = await api.post<{ id: string }>(
      `/emails/${emailId}/reply`,
      request
    );
    return response.data;
  }

  /**
   * List email attachments
   */
  async listAttachments(emailId: string): Promise<EmailAttachment[]> {
    const response = await api.get<EmailAttachment[]>(
      `/emails/${emailId}/attachments`
    );
    return response.data;
  }

  /**
   * Download an attachment
   */
  async downloadAttachment(
    messageId: string,
    partId: string
  ): Promise<DownloadAttachmentResponse> {
    const response = await api.get(`/attachments/${messageId}/${partId}`, {
      responseType: 'blob',
    });

    // Extract filename from Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'attachment';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1]);
      }
    }

    const mimeType =
      response.headers['content-type'] || 'application/octet-stream';
    const size = parseInt(response.headers['content-length'] || '0', 10);

    return {
      data: response.data,
      filename,
      mimeType,
      size,
    };
  }

  /**
   * List threads in a mailbox
   */
  async getThreads(params: {
    labelId?: string;
    page?: string;
    pageSize?: number;
  }): Promise<ThreadListResponse> {
    const { labelId, page, pageSize = 20 } = params;

    const queryParams = new URLSearchParams();
    if (labelId) queryParams.append('labelId', labelId);
    if (page) queryParams.append('page', page);
    queryParams.append('pageSize', pageSize.toString());

    const url = `/threads${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    const response = await api.get<ThreadListResponse>(url);
    return response.data;
  }

  /**
   * Get a complete thread by ID
   */
  async getThreadById(threadId: string): Promise<Thread> {
    const response = await api.get<Thread>(`/threads/${threadId}`);
    return response.data;
  }

  /**
   * Send email with multipart/form-data (for file attachments)
   */
  async sendEmailWithAttachments(
    emailData: SendEmailRequest,
    files: File[]
  ): Promise<{ id: string }> {
    const formData = new FormData();
    formData.append('to', emailData.to);
    formData.append('subject', emailData.subject);
    formData.append('body', emailData.body);
    if (emailData.cc) formData.append('cc', emailData.cc);
    if (emailData.bcc) formData.append('bcc', emailData.bcc);

    files.forEach((file) => {
      formData.append('attachments', file);
    });

    const response = await api.post<{ id: string }>(
      '/emails/send-multipart',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Reply to email with file attachments
   */
  async replyToEmailWithAttachments(
    emailId: string,
    replyData: ReplyEmailRequest,
    files: File[]
  ): Promise<{ id: string }> {
    const formData = new FormData();
    formData.append('body', replyData.body);
    if (replyData.cc) formData.append('cc', replyData.cc);
    if (replyData.bcc) formData.append('bcc', replyData.bcc);

    files.forEach((file) => {
      formData.append('attachments', file);
    });

    const response = await api.post<{ id: string }>(
      `/emails/${emailId}/reply-multipart`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Fuzzy search emails with typo tolerance and partial matching
   */
  async fuzzySearch(params: {
    query: string;
    mailboxId?: string;
    limit?: number;
  }): Promise<FuzzySearchResponse> {
    const { query, mailboxId = 'INBOX', limit = 20 } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('query', query);
    queryParams.append('mailboxId', mailboxId);
    queryParams.append('limit', limit.toString());

    const url = `/search/fuzzy?${queryParams.toString()}`;
    const response = await api.get<FuzzySearchResponse>(url);

    return response.data;
  }

  /**
   * Semantic search using vector similarity
   */
  async semanticSearch(params: {
    query: string;
    limit?: number;
    threshold?: number;
  }): Promise<SemanticSearchResponse> {
    const { query, limit = 10, threshold = 0.7 } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('query', query);
    queryParams.append('limit', limit.toString());
    queryParams.append('threshold', threshold.toString());

    const url = `/email-metadata/search/semantic?${queryParams.toString()}`;
    const response = await api.get<SemanticSearchResponse>(url);

    return response.data;
  }

  /**
   * Get auto-suggestions for search queries
   */
  async getSearchSuggestions(params: {
    query: string;
    limit?: number;
  }): Promise<AutoSuggestionsResponse> {
    const { query, limit = 5 } = params;

    const queryParams = new URLSearchParams();
    queryParams.append('query', query);
    queryParams.append('limit', limit.toString());

    const url = `/search/suggestions?${queryParams.toString()}`;
    const response = await api.get<AutoSuggestionsResponse>(url);

    return response.data;
  }

  /**
   * Save search query to history
   */
  async saveSearchHistory(query: string): Promise<void> {
    await api.post('/search/history', { query });
  }

  // ==================== Kanban Configuration ====================

  /**
   * Get user's Kanban configuration
   */
  async getKanbanConfig(): Promise<KanbanConfigResponse> {
    const response = await api.get<KanbanConfigResponse>(
      '/email-metadata/kanban/config'
    );
    return response.data;
  }

  /**
   * Create a new Kanban column
   */
  async createKanbanColumn(
    request: CreateKanbanColumnRequest
  ): Promise<KanbanColumn> {
    const response = await api.post<{ success: boolean; data: KanbanColumn }>(
      '/email-metadata/kanban/config/columns',
      request
    );
    return response.data.data;
  }

  /**
   * Update an existing Kanban column
   */
  async updateKanbanColumn(
    columnId: string,
    request: UpdateKanbanColumnRequest
  ): Promise<KanbanColumn> {
    const response = await api.put<{ success: boolean; data: KanbanColumn }>(
      `/email-metadata/kanban/config/columns/${columnId}`,
      request
    );
    return response.data.data;
  }

  /**
   * Delete a Kanban column
   */
  async deleteKanbanColumn(columnId: string): Promise<void> {
    await api.delete(`/email-metadata/kanban/config/columns/${columnId}`);
  }

  /**
   * Reorder Kanban columns
   */
  async reorderKanbanColumns(columnIds: string[]): Promise<KanbanColumn[]> {
    const response = await api.post<{
      success: boolean;
      data: { columns: KanbanColumn[] };
    }>('/email-metadata/kanban/config/reorder', { columnIds });
    return response.data.data.columns;
  }
}

// Export singleton instance
export const gmailApi = new GmailApiService();

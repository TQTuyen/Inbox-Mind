/**
 * Email transformation utilities
 * Centralized functions for converting between different email formats
 */

import { Email } from '@fe/types/email.types';

/**
 * Transform Kanban API email response to Email format
 * Handles optional fields gracefully and provides safe defaults
 */
export function transformKanbanEmailToStoreFormat(apiEmail: Email): Email {
  return {
    // Required fields - always present
    id: apiEmail.id,
    from: apiEmail.from,
    to: apiEmail.to,
    subject: apiEmail.subject,
    preview: apiEmail.preview,
    body: apiEmail.body,
    timestamp: apiEmail.timestamp,
    isRead: apiEmail.isRead,
    isStarred: apiEmail.isStarred,

    // Optional fields - may be undefined
    threadId: apiEmail.threadId,
    cc: apiEmail.cc,
    bcc: apiEmail.bcc,
    attachments: apiEmail.attachments,
    labelIds: apiEmail.labelIds,
    snippet: apiEmail.snippet,
    internalDate: apiEmail.internalDate,

    // Kanban-specific fields with safe defaults
    mailboxId: apiEmail.mailboxId || 'INBOX',
    kanbanStatus: apiEmail.kanbanStatus || 'inbox',
    snoozeUntil: apiEmail.snoozeUntil ?? null,
    summary: apiEmail.summary ?? null,
    note: apiEmail.note ?? null,
  };
}

/**
 * Transform search result to Email format
 * Handles both fuzzy and semantic search result formats
 */
export function transformSearchResultToEmail(
  result: any,
  mailboxId = 'INBOX'
): Email {
  // Handle both fuzzy and semantic search result formats
  const emailId = 'emailId' in result ? result.emailId : result.id;
  const snippet = 'snippet' in result ? result.snippet : result.preview;
  const hasAttachments =
    'hasAttachments' in result ? result.hasAttachments : false;

  return {
    id: emailId,
    subject: result.subject,
    from: result.from,
    to: [],
    preview: snippet,
    body: snippet,
    timestamp: result.timestamp,
    isRead: result.isRead,
    isStarred: false,
    attachments: hasAttachments ? [] : undefined,
    mailboxId,
  };
}

/**
 * Batch transform array of emails
 */
export function transformKanbanEmailsBatch(apiEmails: Email[]): Email[] {
  return apiEmails.map(transformKanbanEmailToStoreFormat);
}

/**
 * Batch transform search results
 */
export function transformSearchResultsBatch(
  results: any[],
  mailboxId = 'INBOX'
): Email[] {
  return results.map((result) =>
    transformSearchResultToEmail(result, mailboxId)
  );
}

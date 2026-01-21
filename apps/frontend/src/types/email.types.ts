/**
 * Shared email types used across the application
 * This file centralizes email-related type definitions to avoid duplication
 */

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

/**
 * KanbanStatus is a flexible string type to allow custom user-defined statuses.
 * Users can create any status they want (not limited to predefined values).
 *
 * Default statuses: 'inbox', 'todo', 'in_progress', 'done', 'snoozed'
 * But users can add their own custom statuses as needed.
 */
export type KanbanStatus = string;

/**
 * Core Email interface used throughout the application
 * This is the single source of truth for email data structure
 */
export interface Email {
  // Basic email info
  id: string;
  threadId?: string;
  subject: string;
  preview: string;
  body: string;
  timestamp: string;

  // Participants
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];

  // Status flags
  isRead: boolean;
  isStarred: boolean;

  // Attachments
  attachments?: EmailAttachment[];

  // Gmail-specific
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;

  // Kanban metadata (optional, may not exist on all emails)
  mailboxId?: string;
  kanbanStatus?: KanbanStatus;
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

import { Email } from '../../mailbox/store/emailStore';

export type SortOption = 'date-desc' | 'date-asc' | 'sender';
export type FilterOption = 'unread' | 'attachments' | 'important';

export interface KanbanColumn {
  id: string;
  title: string;
  labelId: string;
  emails: Email[];
}

export interface SortConfig {
  id: SortOption;
  label: string;
  sortFn: (a: Email, b: Email) => number;
}

export interface FilterConfig {
  id: FilterOption;
  label: string;
  filterFn: (email: Email) => boolean;
}

export const KANBAN_COLUMNS: Omit<KanbanColumn, 'emails'>[] = [
  { id: 'INBOX', title: 'Inbox', labelId: 'INBOX' },
  { id: 'TODO', title: 'To Do', labelId: 'TODO' },
  { id: 'IN_PROGRESS', title: 'In Progress', labelId: 'IN_PROGRESS' },
  { id: 'DONE', title: 'Done', labelId: 'DONE' },
];

export const SORT_OPTIONS: SortConfig[] = [
  {
    id: 'date-desc',
    label: 'Date: Newest First',
    sortFn: (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  },
  {
    id: 'date-asc',
    label: 'Date: Oldest First',
    sortFn: (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  },
  {
    id: 'sender',
    label: 'Sender Name',
    sortFn: (a, b) => a.from.name.localeCompare(b.from.name),
  },
];

export const FILTER_OPTIONS: FilterConfig[] = [
  {
    id: 'unread',
    label: 'Show only Unread',
    filterFn: (email) => !email.isRead,
  },
  {
    id: 'attachments',
    label: 'Has Attachments',
    filterFn: (email) => (email.attachments?.length ?? 0) > 0,
  },
  {
    id: 'important',
    label: 'Important',
    filterFn: (email) => email.isStarred, // Using starred as "important"
  },
];

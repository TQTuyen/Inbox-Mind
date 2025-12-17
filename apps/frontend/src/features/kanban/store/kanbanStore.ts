import { create } from 'zustand';
import { gmailApi } from '@fe/services/api/gmailApi';
import { Email } from '../../mailbox/store/emailStore';
import {
  KanbanColumn,
  SortOption,
  FilterOption,
  KANBAN_COLUMNS,
  SORT_OPTIONS,
  FILTER_OPTIONS,
} from '../types';

interface KanbanState {
  // Data
  columns: KanbanColumn[];

  // UI State
  sortBy: SortOption;
  activeFilters: FilterOption[];
  loading: boolean;
  error: string | null;

  // Actions
  setColumns: (columns: KanbanColumn[]) => void;
  initializeColumns: (emails: Email[]) => void;
  setSortBy: (sortBy: SortOption) => void;
  toggleFilter: (filter: FilterOption) => void;
  clearFilters: () => void;
  moveEmail: (
    emailId: string,
    fromColumnId: string,
    toColumnId: string
  ) => Promise<void>;
  updateEmailInColumn: (emailId: string, updates: Partial<Email>) => void;
  deleteEmailFromColumn: (emailId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Computed
  getSortedAndFilteredEmails: (emails: Email[]) => Email[];
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  // Initial state
  columns: KANBAN_COLUMNS.map((col) => ({ ...col, emails: [] })),
  sortBy: 'date-desc',
  activeFilters: [],
  loading: false,
  error: null,

  // Actions
  setColumns: (columns) => set({ columns }),

  initializeColumns: (emails: Email[]) => {
    const columns = KANBAN_COLUMNS.map((columnDef) => {
      // Map labelId to kanbanStatus (INBOX -> inbox, IN_PROGRESS -> in_progress, etc.)
      const kanbanStatusMap: Record<string, string> = {
        INBOX: 'inbox',
        TODO: 'todo',
        IN_PROGRESS: 'in_progress',
        DONE: 'done',
      };

      const expectedStatus = kanbanStatusMap[columnDef.labelId];

      // Filter emails by kanbanStatus matching column
      // If email doesn't have kanbanStatus, fall back to mailboxId for backwards compatibility
      const columnEmails = emails.filter((email) => {
        if (email.kanbanStatus) {
          return email.kanbanStatus === expectedStatus;
        }
        // Fallback: use mailboxId for emails without kanbanStatus
        return email.mailboxId === columnDef.labelId;
      });

      // Apply sorting and filtering
      const processedEmails = get().getSortedAndFilteredEmails(columnEmails);

      return {
        ...columnDef,
        emails: processedEmails,
      };
    });

    set({ columns });
  },

  setSortBy: (sortBy) => {
    set({ sortBy });

    // Re-sort all columns
    const { columns, getSortedAndFilteredEmails } = get();
    const updatedColumns = columns.map((col) => ({
      ...col,
      emails: getSortedAndFilteredEmails(col.emails),
    }));

    set({ columns: updatedColumns });
  },

  toggleFilter: (filter) => {
    const { activeFilters, columns, getSortedAndFilteredEmails } = get();

    const newFilters = activeFilters.includes(filter)
      ? activeFilters.filter((f) => f !== filter)
      : [...activeFilters, filter];

    set({ activeFilters: newFilters });

    // Re-filter all columns with original emails
    // Note: In real app, you'd want to keep original unfiltered data
    const updatedColumns = columns.map((col) => ({
      ...col,
      emails: getSortedAndFilteredEmails(col.emails),
    }));

    set({ columns: updatedColumns });
  },

  clearFilters: () => {
    set({ activeFilters: [] });

    // Re-apply without filters
    const { columns, getSortedAndFilteredEmails } = get();
    const updatedColumns = columns.map((col) => ({
      ...col,
      emails: getSortedAndFilteredEmails(col.emails),
    }));

    set({ columns: updatedColumns });
  },

  moveEmail: async (emailId, fromColumnId, toColumnId) => {
    const { columns } = get();

    // Find source and destination columns
    const fromColumn = columns.find((col) => col.id === fromColumnId);
    const toColumn = columns.find((col) => col.id === toColumnId);

    if (!fromColumn || !toColumn) return;

    // Find the email to move
    const email = fromColumn.emails.find((e) => e.id === emailId);
    if (!email) return;

    // Map labelId to kanbanStatus for optimistic update
    const kanbanStatusMap: Record<string, 'inbox' | 'todo' | 'in_progress' | 'done'> = {
      INBOX: 'inbox',
      TODO: 'todo',
      IN_PROGRESS: 'in_progress',
      DONE: 'done',
    };

    // Optimistic update - update UI first
    const updatedEmail = {
      ...email,
      mailboxId: toColumn.labelId,
      kanbanStatus: kanbanStatusMap[toColumn.labelId],
    };

    // Remove from source column
    const updatedFromEmails = fromColumn.emails.filter((e) => e.id !== emailId);

    // Add to destination column
    const updatedToEmails = [...toColumn.emails, updatedEmail];

    // Update columns immediately (optimistic)
    const updatedColumns = columns.map((col) => {
      if (col.id === fromColumnId) {
        return { ...col, emails: updatedFromEmails };
      }
      if (col.id === toColumnId) {
        return {
          ...col,
          emails: get().getSortedAndFilteredEmails(updatedToEmails),
        };
      }
      return col;
    });

    set({ columns: updatedColumns });

    // Update on server
    try {
      // Map labelId to kanbanStatus
      const kanbanStatusMap: Record<string, 'inbox' | 'todo' | 'in_progress' | 'done'> = {
        INBOX: 'inbox',
        TODO: 'todo',
        IN_PROGRESS: 'in_progress',
        DONE: 'done',
      };

      const newKanbanStatus = kanbanStatusMap[toColumn.labelId];

      // Update kanban status in database first
      await gmailApi.updateKanbanStatus(emailId, newKanbanStatus);

      // Then update Gmail labels
      const labelsToRemove = [fromColumn.labelId];
      const labelsToAdd = [toColumn.labelId];

      // Remove old label(s)
      if (labelsToRemove.length > 0) {
        await gmailApi.modifyLabels(emailId, {
          action: 'remove',
          labelIds: labelsToRemove,
        });
      }

      // Add new label(s)
      if (labelsToAdd.length > 0) {
        await gmailApi.modifyLabels(emailId, {
          action: 'add',
          labelIds: labelsToAdd,
        });
      }
    } catch (error) {
      console.error('Failed to update email labels:', error);

      // Rollback on error - restore original state
      set({ columns });

      // Show error to user
      set({ error: 'Failed to move email. Please try again.' });
    }
  },

  updateEmailInColumn: (emailId, updates) => {
    const { columns } = get();

    const updatedColumns = columns.map((col) => ({
      ...col,
      emails: col.emails.map((email) =>
        email.id === emailId ? { ...email, ...updates } : email
      ),
    }));

    set({ columns: updatedColumns });
  },

  deleteEmailFromColumn: (emailId) => {
    const { columns } = get();

    const updatedColumns = columns.map((col) => ({
      ...col,
      emails: col.emails.filter((email) => email.id !== emailId),
    }));

    set({ columns: updatedColumns });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Computed function
  getSortedAndFilteredEmails: (emails: Email[]) => {
    const { sortBy, activeFilters } = get();

    // Apply filters
    let filtered = [...emails];
    if (activeFilters.length > 0) {
      filtered = emails.filter((email) =>
        activeFilters.every((filterId) => {
          const filterConfig = FILTER_OPTIONS.find((f) => f.id === filterId);
          return filterConfig ? filterConfig.filterFn(email) : true;
        })
      );
    }

    // Apply sorting
    const sortConfig = SORT_OPTIONS.find((s) => s.id === sortBy);
    if (sortConfig) {
      filtered.sort(sortConfig.sortFn);
    }

    return filtered;
  },
}));

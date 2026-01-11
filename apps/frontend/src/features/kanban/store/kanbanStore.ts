import { create } from 'zustand';
import {
  gmailApi,
  KanbanColumn as KanbanColumnConfig,
} from '@fe/services/api/gmailApi';
import { Email } from '../../mailbox/store/emailStore';
import {
  KanbanColumn,
  SortOption,
  FilterOption,
  SORT_OPTIONS,
  FILTER_OPTIONS,
} from '../types';

interface KanbanState {
  // Data
  columns: KanbanColumn[];
  columnConfig: KanbanColumnConfig[]; // Dynamic column configuration from API

  // UI State
  sortBy: SortOption;
  activeFilters: FilterOption[];
  loading: boolean;
  error: string | null;

  // Actions
  setColumns: (columns: KanbanColumn[]) => void;
  setColumnConfig: (config: KanbanColumnConfig[]) => void;
  initializeColumns: (emails: Email[], config?: KanbanColumnConfig[]) => void;
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
  columns: [],
  columnConfig: [],
  sortBy: 'date-desc',
  activeFilters: [],
  loading: false,
  error: null,

  // Actions
  setColumns: (columns) => set({ columns }),
  setColumnConfig: (config) => set({ columnConfig: config }),

  initializeColumns: (emails: Email[], config?: KanbanColumnConfig[]) => {
    // Use provided config or fallback to stored config
    const columnDefinitions = config || get().columnConfig;

    if (columnDefinitions.length === 0) {
      return;
    }

    const columns = columnDefinitions.map((columnDef) => {
      // Map columnId to kanbanStatus (INBOX -> inbox, etc.)
      // Use the columnId as the status identifier
      const columnIdLower = columnDef.columnId.toLowerCase();

      // Map specific known column IDs to their kanban status
      const kanbanStatusMap: Record<string, string> = {
        INBOX: 'inbox',
        TODO: 'todo',
        IN_PROGRESS: 'in_progress',
        DONE: 'done',
      };

      const expectedStatus =
        kanbanStatusMap[columnDef.columnId] || columnIdLower;

      // Filter emails by kanbanStatus matching column
      const columnEmails = emails.filter((email) => {
        if (email.kanbanStatus) {
          return email.kanbanStatus === expectedStatus;
        }
        // Fallback: match by gmailLabelId or mailboxId
        return (
          email.mailboxId === columnDef.gmailLabelId ||
          email.mailboxId === columnDef.columnId
        );
      });

      // Apply sorting and filtering
      const processedEmails = get().getSortedAndFilteredEmails(columnEmails);

      return {
        id: columnDef.columnId,
        title: columnDef.title,
        labelId: columnDef.gmailLabelId,
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
    const { columns, columnConfig } = get();

    // Find source and destination columns
    const fromColumn = columns.find((col) => col.id === fromColumnId);
    const toColumn = columns.find((col) => col.id === toColumnId);

    if (!fromColumn || !toColumn) return;

    // Find the email to move
    const email = fromColumn.emails.find((e) => e.id === emailId);
    if (!email) return;

    // Find the column config to get the proper kanban status mapping
    const toColumnConfig = columnConfig.find((c) => c.columnId === toColumnId);
    if (!toColumnConfig) {
      console.error('Column configuration not found for:', toColumnId);
      return;
    }

    // Map columnId to kanbanStatus
    const kanbanStatusMap: Record<string, string> = {
      INBOX: 'inbox',
      TODO: 'todo',
      IN_PROGRESS: 'in_progress',
      DONE: 'done',
    };

    const newKanbanStatus =
      kanbanStatusMap[toColumnId] || toColumnId.toLowerCase();

    // Optimistic update - update UI first
    const updatedEmail = {
      ...email,
      mailboxId: toColumn.labelId,
      kanbanStatus: newKanbanStatus as
        | 'inbox'
        | 'todo'
        | 'in_progress'
        | 'done',
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
      // Update kanban status in database first
      await gmailApi.updateKanbanStatus(
        emailId,
        newKanbanStatus as 'inbox' | 'todo' | 'in_progress' | 'done'
      );

      // Then update Gmail labels using the actual Gmail label IDs from config
      const labelsToRemove = [fromColumn.labelId];
      const labelsToAdd = [toColumnConfig.gmailLabelId];

      // Remove old label(s)
      if (labelsToRemove.length > 0 && labelsToRemove[0]) {
        await gmailApi.modifyLabels(emailId, {
          action: 'remove',
          labelIds: labelsToRemove,
        });
      }

      // Add new label(s)
      if (labelsToAdd.length > 0 && labelsToAdd[0]) {
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

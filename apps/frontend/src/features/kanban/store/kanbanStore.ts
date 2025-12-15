import { create } from 'zustand';
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
  ) => void;
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
      // Filter emails by mailboxId matching column labelId
      const columnEmails = emails.filter(
        (email) => email.mailboxId === columnDef.labelId
      );

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

  moveEmail: (emailId, fromColumnId, toColumnId) => {
    const { columns } = get();

    // Find source and destination columns
    const fromColumn = columns.find((col) => col.id === fromColumnId);
    const toColumn = columns.find((col) => col.id === toColumnId);

    if (!fromColumn || !toColumn) return;

    // Find the email to move
    const email = fromColumn.emails.find((e) => e.id === emailId);
    if (!email) return;

    // Update email's mailboxId
    const updatedEmail = { ...email, mailboxId: toColumn.labelId };

    // Remove from source column
    const updatedFromEmails = fromColumn.emails.filter((e) => e.id !== emailId);

    // Add to destination column
    const updatedToEmails = [...toColumn.emails, updatedEmail];

    // Update columns
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

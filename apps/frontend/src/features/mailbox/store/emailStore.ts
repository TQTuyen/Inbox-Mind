import { create } from 'zustand';

export type KanbanStatus =
  | 'inbox'
  | 'todo'
  | 'in_progress'
  | 'done'
  | 'snoozed';

export interface Email {
  id: string;
  from: {
    name: string;
    email: string;
  };
  to: Array<{ name: string; email: string }>;
  cc?: Array<{ name: string; email: string }>;
  subject: string;
  preview: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
  }>;
  mailboxId: string;
  note?: string;
  kanbanStatus?: KanbanStatus;
  snoozeUntil?: string;
  summary?: string;
}

export interface Mailbox {
  id: string;
  name: string;
  unreadCount: number;
}

interface EmailState {
  mailboxes: Mailbox[];
  selectedMailboxId: string | null;
  emails: Email[];
  selectedEmail: Email | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  searchKeyword: string;
  selectedCategory: string;
  viewMode: 'list' | 'kanban';
  // Fuzzy search state
  isSearchMode: boolean;
  searchQuery: string;
  searchResults: Email[];
  searchLoading: boolean;
  setMailboxes: (mailboxes: Mailbox[]) => void;
  setSelectedMailbox: (id: string) => void;
  setEmails: (emails: Email[], totalPages: number) => void;
  setSelectedEmail: (email: Email | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (page: number) => void;
  setSearchKeyword: (keyword: string) => void;
  setSelectedCategory: (category: string) => void;
  setViewMode: (mode: 'list' | 'kanban') => void;
  updateEmail: (id: string, updates: Partial<Email>) => void;
  deleteEmail: (id: string) => void;
  // Fuzzy search actions
  setSearchMode: (isSearchMode: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Email[]) => void;
  setSearchLoading: (loading: boolean) => void;
  clearSearch: () => void;
}

export const useEmailStore = create<EmailState>((set) => ({
  mailboxes: [], // Initialize as empty array
  selectedMailboxId: null,
  emails: [], // Initialize as empty array
  selectedEmail: null,
  loading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  searchKeyword: '',
  selectedCategory: 'all',
  viewMode: 'list',
  // Fuzzy search initial state
  isSearchMode: false,
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
  setMailboxes: (mailboxes) => set({ mailboxes }),
  setSelectedMailbox: (id) => set({ selectedMailboxId: id, currentPage: 1 }),
  setEmails: (emails, totalPages) => set({ emails, totalPages }),
  setSelectedEmail: (email) => set({ selectedEmail: email }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setSearchKeyword: (keyword) =>
    set({ searchKeyword: keyword, currentPage: 1 }),
  setSelectedCategory: (category) =>
    set({ selectedCategory: category, currentPage: 1 }),
  setViewMode: (mode) => set({ viewMode: mode }),
  updateEmail: (id, updates) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        email.id === id ? { ...email, ...updates } : email
      ),
      selectedEmail:
        state.selectedEmail?.id === id
          ? { ...state.selectedEmail, ...updates }
          : state.selectedEmail,
      // Also update in search results if in search mode
      searchResults: state.isSearchMode
        ? state.searchResults.map((email) =>
            email.id === id ? { ...email, ...updates } : email
          )
        : state.searchResults,
    })),
  deleteEmail: (id) =>
    set((state) => ({
      emails: state.emails.filter((email) => email.id !== id),
      selectedEmail:
        state.selectedEmail?.id === id ? null : state.selectedEmail,
      searchResults: state.searchResults.filter((email) => email.id !== id),
    })),
  // Fuzzy search actions
  setSearchMode: (isSearchMode) => set({ isSearchMode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchLoading: (loading) => set({ searchLoading: loading }),
  clearSearch: () =>
    set({
      isSearchMode: false,
      searchQuery: '',
      searchResults: [],
      searchLoading: false,
    }),
}));

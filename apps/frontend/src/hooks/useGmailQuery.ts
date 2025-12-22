import {
  DownloadAttachmentResponse,
  Email,
  EmailAttachment,
  EmailListResponse,
  FuzzySearchResponse,
  gmailApi,
  Mailbox,
  ModifyLabelsRequest,
  ReplyEmailRequest,
  SendEmailRequest,
  Thread,
  ThreadListResponse,
} from '@fe/services/api/gmailApi';
import {
  useInfiniteQuery,
  UseInfiniteQueryOptions,
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';

// ==================== Query Keys ====================

export const gmailKeys = {
  all: ['gmail'] as const,
  mailboxes: () => [...gmailKeys.all, 'mailboxes'] as const,
  emails: () => [...gmailKeys.all, 'emails'] as const,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emailList: (mailboxId: string, filters?: Record<string, any>) =>
    [...gmailKeys.emails(), 'list', mailboxId, filters] as const,
  emailDetail: (emailId: string) =>
    [...gmailKeys.emails(), 'detail', emailId] as const,
  kanbanEmails: () => [...gmailKeys.emails(), 'kanban'] as const,
  threads: () => [...gmailKeys.all, 'threads'] as const,
  threadList: (labelId?: string) =>
    [...gmailKeys.threads(), 'list', labelId] as const,
  threadDetail: (threadId: string) =>
    [...gmailKeys.threads(), 'detail', threadId] as const,
  attachments: (emailId: string) =>
    [...gmailKeys.emails(), 'attachments', emailId] as const,
  search: () => [...gmailKeys.all, 'search'] as const,
  fuzzySearch: (query: string, mailboxId?: string) =>
    [...gmailKeys.search(), 'fuzzy', query, mailboxId] as const,
};

// ==================== Mailbox Hooks ====================

/**
 * Fetch all mailboxes/labels
 */
export function useMailboxes(
  options?: Omit<UseQueryOptions<Mailbox[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Mailbox[], Error>({
    queryKey: gmailKeys.mailboxes(),
    queryFn: () => gmailApi.getMailboxes(),
    staleTime: 5 * 60 * 1000, // Mailboxes don't change often, 5 minutes
    ...options,
  });
}

// ==================== Email List Hooks ====================

/**
 * Fetch emails for a specific mailbox with pagination
 */
export function useEmails(
  mailboxId: string,
  pageSize = 20,
  options?: Omit<
    UseQueryOptions<EmailListResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<EmailListResponse, Error>({
    queryKey: gmailKeys.emailList(mailboxId, { pageSize }),
    queryFn: () => gmailApi.getEmails({ mailboxId, pageSize }),
    enabled: !!mailboxId,
    ...options,
  });
}

/**
 * Infinite scroll for emails
 */
export function useInfiniteEmails(
  mailboxId: string,
  pageSize = 20,
  options?: Partial<UseInfiniteQueryOptions<EmailListResponse, Error>>
) {
  return useInfiniteQuery({
    queryKey: gmailKeys.emailList(mailboxId, { pageSize }),
    queryFn: ({ pageParam }) =>
      gmailApi.getEmails({
        mailboxId,
        page: pageParam as string | undefined,
        pageSize,
      }),
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!mailboxId,
    ...options,
  });
}

/**
 * Fetch all emails for Kanban board (INBOX, TODO, IN_PROGRESS, DONE)
 */
export function useKanbanEmails(
  options?: Omit<UseQueryOptions<Email[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Email[], Error>({
    queryKey: gmailKeys.kanbanEmails(),
    queryFn: () => gmailApi.getKanbanEmails(),
    staleTime: 30 * 1000, // 30 seconds - Kanban data updates frequently
    ...options,
  });
}

/**
 * Fetch a single email by ID
 */
export function useEmail(
  emailId: string | null | undefined,
  options?: Omit<UseQueryOptions<Email, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Email, Error>({
    queryKey: gmailKeys.emailDetail(emailId || ''),
    queryFn: () => gmailApi.getEmailById(emailId || ''),
    enabled: !!emailId,
    ...options,
  });
}

// ==================== Thread Hooks ====================

/**
 * Fetch threads with infinite scroll
 */
export function useInfiniteThreads(
  labelId?: string,
  pageSize = 20,
  options?: Partial<UseInfiniteQueryOptions<ThreadListResponse, Error>>
) {
  return useInfiniteQuery({
    queryKey: gmailKeys.threadList(labelId),
    queryFn: ({ pageParam }) =>
      gmailApi.getThreads({
        labelId,
        page: pageParam as string | undefined,
        pageSize,
      }),
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    initialPageParam: undefined as string | undefined,
    ...options,
  });
}

/**
 * Fetch a complete thread by ID
 */
export function useThread(
  threadId: string | null | undefined,
  options?: Omit<UseQueryOptions<Thread, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<Thread, Error>({
    queryKey: gmailKeys.threadDetail(threadId || ''),
    queryFn: () => gmailApi.getThreadById(threadId || ''),
    enabled: !!threadId,
    ...options,
  });
}

// ==================== Attachment Hooks ====================

/**
 * List attachments for an email
 */
export function useAttachments(
  emailId: string | null | undefined,
  options?: Omit<
    UseQueryOptions<EmailAttachment[], Error>,
    'queryKey' | 'queryFn'
  >
) {
  return useQuery<EmailAttachment[], Error>({
    queryKey: gmailKeys.attachments(emailId || ''),
    queryFn: () => gmailApi.listAttachments(emailId || ''),
    enabled: !!emailId,
    staleTime: 10 * 60 * 1000, // Attachments don't change, 10 minutes
    ...options,
  });
}

/**
 * Download an attachment (mutation because it's a one-time action)
 */
export function useDownloadAttachment(
  options?: UseMutationOptions<
    DownloadAttachmentResponse,
    Error,
    { messageId: string; partId: string }
  >
) {
  return useMutation<
    DownloadAttachmentResponse,
    Error,
    { messageId: string; partId: string }
  >({
    mutationFn: ({ messageId, partId }) =>
      gmailApi.downloadAttachment(messageId, partId),
    ...options,
  });
}

// ==================== Email Action Mutations ====================

/**
 * Mark email as read/unread with optimistic update
 */
export function useMarkAsRead(
  options?: UseMutationOptions<void, Error, { emailId: string; read: boolean }>
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { emailId: string; read: boolean }>({
    mutationFn: ({ emailId, read }) => gmailApi.markAsRead(emailId, read),
    onMutate: async ({ emailId, read }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: gmailKeys.emails() });

      // Snapshot previous value
      const previousEmail = queryClient.getQueryData<Email>(
        gmailKeys.emailDetail(emailId)
      );

      // Optimistically update email detail
      queryClient.setQueryData<Email>(gmailKeys.emailDetail(emailId), (old) =>
        old ? { ...old, isRead: read } : old
      );

      // Optimistically update in email lists
      queryClient.setQueriesData<EmailListResponse>(
        { queryKey: gmailKeys.emails() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            emails: old.emails.map((email) =>
              email.id === emailId ? { ...email, isRead: read } : email
            ),
          };
        }
      );

      return { previousEmail };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (_, variables, context: any) => {
      // Rollback on error
      if (context?.previousEmail) {
        queryClient.setQueryData(
          gmailKeys.emailDetail(variables.emailId),
          context.previousEmail
        );
      }
    },
    onSettled: (_, __, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: gmailKeys.emails() });
      queryClient.invalidateQueries({
        queryKey: gmailKeys.emailDetail(variables.emailId),
      });
    },
    ...options,
  });
}

/**
 * Toggle star status with optimistic update
 */
export function useToggleStar(
  options?: UseMutationOptions<
    void,
    Error,
    { emailId: string; isStarred: boolean }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { emailId: string; isStarred: boolean }>({
    mutationFn: ({ emailId, isStarred }) =>
      gmailApi.toggleStar(emailId, !isStarred),
    onMutate: async ({ emailId, isStarred }) => {
      await queryClient.cancelQueries({ queryKey: gmailKeys.emails() });

      const newStarredState = !isStarred;

      // Update email detail
      queryClient.setQueryData<Email>(gmailKeys.emailDetail(emailId), (old) =>
        old ? { ...old, isStarred: newStarredState } : old
      );

      // Update in email lists
      queryClient.setQueriesData<EmailListResponse>(
        { queryKey: gmailKeys.emails() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            emails: old.emails.map((email) =>
              email.id === emailId
                ? { ...email, isStarred: newStarredState }
                : email
            ),
          };
        }
      );
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: gmailKeys.emails() });
      queryClient.invalidateQueries({
        queryKey: gmailKeys.emailDetail(variables.emailId),
      });
    },
    ...options,
  });
}

/**
 * Delete email
 */
export function useDeleteEmail(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (emailId) => gmailApi.deleteEmail(emailId),
    onMutate: async (emailId) => {
      await queryClient.cancelQueries({ queryKey: gmailKeys.emails() });

      // Optimistically remove from lists
      queryClient.setQueriesData<EmailListResponse>(
        { queryKey: gmailKeys.emails() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            emails: old.emails.filter((email) => email.id !== emailId),
          };
        }
      );
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: gmailKeys.emails() });
      queryClient.invalidateQueries({ queryKey: gmailKeys.mailboxes() });
    },
    ...options,
  });
}

/**
 * Archive email (remove from inbox)
 */
export function useArchiveEmail(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (emailId) => gmailApi.archiveEmail(emailId),
    onMutate: async (emailId) => {
      await queryClient.cancelQueries({ queryKey: gmailKeys.emails() });

      // Remove from inbox list
      queryClient.setQueriesData<EmailListResponse>(
        { queryKey: gmailKeys.emailList('INBOX', {}) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            emails: old.emails.filter((email) => email.id !== emailId),
          };
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gmailKeys.emails() });
      queryClient.invalidateQueries({ queryKey: gmailKeys.mailboxes() });
    },
    ...options,
  });
}

/**
 * Move email to a different mailbox
 */
export function useMoveToMailbox(
  options?: UseMutationOptions<
    void,
    Error,
    { emailId: string; mailboxId: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { emailId: string; mailboxId: string }>({
    mutationFn: ({ emailId, mailboxId }) =>
      gmailApi.moveToMailbox(emailId, mailboxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gmailKeys.emails() });
      queryClient.invalidateQueries({ queryKey: gmailKeys.mailboxes() });
    },
    ...options,
  });
}

/**
 * Modify labels on an email
 */
export function useModifyLabels(
  options?: UseMutationOptions<
    void,
    Error,
    { emailId: string; request: ModifyLabelsRequest }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { emailId: string; request: ModifyLabelsRequest }
  >({
    mutationFn: ({ emailId, request }) =>
      gmailApi.modifyLabels(emailId, request),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gmailKeys.emails() });
      queryClient.invalidateQueries({
        queryKey: gmailKeys.emailDetail(variables.emailId),
      });
    },
    ...options,
  });
}

// ==================== Send/Reply Mutations ====================

/**
 * Send a new email
 */
export function useSendEmail(
  options?: UseMutationOptions<{ id: string }, Error, SendEmailRequest>
) {
  const queryClient = useQueryClient();

  return useMutation<{ id: string }, Error, SendEmailRequest>({
    mutationFn: (request) => gmailApi.sendEmail(request),
    onSuccess: () => {
      // Invalidate sent mailbox and mailboxes list
      queryClient.invalidateQueries({
        queryKey: gmailKeys.emailList('SENT', {}),
      });
      queryClient.invalidateQueries({ queryKey: gmailKeys.mailboxes() });
    },
    ...options,
  });
}

/**
 * Reply to an email
 */
export function useReplyToEmail(
  options?: UseMutationOptions<
    { id: string },
    Error,
    { emailId: string; request: ReplyEmailRequest }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string },
    Error,
    { emailId: string; request: ReplyEmailRequest }
  >({
    mutationFn: ({ emailId, request }) =>
      gmailApi.replyToEmail(emailId, request),
    onSuccess: (data, variables) => {
      // Invalidate the email detail to show the reply
      queryClient.invalidateQueries({
        queryKey: gmailKeys.emailDetail(variables.emailId),
      });
      queryClient.invalidateQueries({ queryKey: gmailKeys.threads() });
      queryClient.invalidateQueries({ queryKey: gmailKeys.emails() });
    },
    ...options,
  });
}

/**
 * Send email with file attachments
 */
export function useSendEmailWithAttachments(
  options?: UseMutationOptions<
    { id: string },
    Error,
    { emailData: SendEmailRequest; files: File[] }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string },
    Error,
    { emailData: SendEmailRequest; files: File[] }
  >({
    mutationFn: ({ emailData, files }) =>
      gmailApi.sendEmailWithAttachments(emailData, files),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: gmailKeys.emailList('SENT', {}),
      });
      queryClient.invalidateQueries({ queryKey: gmailKeys.mailboxes() });
    },
    ...options,
  });
}

/**
 * Reply to email with file attachments
 */
export function useReplyToEmailWithAttachments(
  options?: UseMutationOptions<
    { id: string },
    Error,
    { emailId: string; replyData: ReplyEmailRequest; files: File[] }
  >
) {
  const queryClient = useQueryClient();

  return useMutation<
    { id: string },
    Error,
    { emailId: string; replyData: ReplyEmailRequest; files: File[] }
  >({
    mutationFn: ({ emailId, replyData, files }) =>
      gmailApi.replyToEmailWithAttachments(emailId, replyData, files),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: gmailKeys.emailDetail(variables.emailId),
      });
      queryClient.invalidateQueries({ queryKey: gmailKeys.threads() });
      queryClient.invalidateQueries({ queryKey: gmailKeys.emails() });
    },
    ...options,
  });
}

// ==================== Fuzzy Search Hooks ====================

/**
 * Fuzzy search emails with typo tolerance and partial matching
 */
export function useFuzzySearch(
  params: {
    query: string;
    mailboxId?: string;
    limit?: number;
  },
  options?: Omit<
    UseQueryOptions<FuzzySearchResponse, Error>,
    'queryKey' | 'queryFn'
  >
) {
  const { query, mailboxId, limit } = params;

  return useQuery<FuzzySearchResponse, Error>({
    queryKey: gmailKeys.fuzzySearch(query, mailboxId),
    queryFn: () => gmailApi.fuzzySearch({ query, mailboxId, limit }),
    enabled: query.length >= 2, // Only search if query has at least 2 characters
    staleTime: 30 * 1000, // 30 seconds - search results can change
    ...options,
  });
}

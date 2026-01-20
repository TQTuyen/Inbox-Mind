import { EmailDetail } from '@fe/features/mailbox/components/EmailDetail';
import { Sidebar } from '@fe/features/mailbox/components/Sidebar';
import { Email, useEmailStore } from '@fe/features/mailbox/store/emailStore';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@fe/shared/components/ui/resizable';
import { Sheet, SheetContent } from '@fe/shared/components/ui/sheet';
import { SnoozeModal } from '@fe/shared/components/SnoozeModal';
import { emailMetadataApi } from '@fe/services/api/emailMetadataApi';
import { gmailApi } from '@fe/services/api/gmailApi';
import { useMailboxes } from '@fe/hooks/useGmailQuery';
import { useMutation } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { KanbanBoard } from '../components/KanbanBoard';
import { useKanban } from '../hooks/useKanban';
import { useKanbanStore } from '../store/kanbanStore';

export function KanbanPage() {
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [generatingSummaryId, setGeneratingSummaryId] = useState<string | null>(
    null
  );
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);
  const [emailToSnooze, setEmailToSnooze] = useState<Email | null>(null);

  const { selectedEmail, setSelectedEmail, setMailboxes } = useEmailStore();
  const updateEmailInColumn = useKanbanStore(
    (state) => state.updateEmailInColumn
  );
  const deleteEmailFromColumn = useKanbanStore(
    (state) => state.deleteEmailFromColumn
  );
  const columns = useKanbanStore((state) => state.columns);

  // Initialize kanban hook
  useKanban();

  // Fetch mailboxes for the sidebar (separate from kanban emails)
  const { data: mailboxesData = [] } = useMailboxes({
    staleTime: 5 * 60 * 1000,
  });

  // Sync mailboxes to store for Sidebar to use
  useEffect(() => {
    if (mailboxesData.length > 0) {
      const transformedMailboxes = mailboxesData.map((mailbox) => ({
        id: mailbox.id,
        name: mailbox.name,
        unreadCount: mailbox.unreadCount || 0,
      }));
      setMailboxes(transformedMailboxes);
    }
  }, [mailboxesData, setMailboxes]);

  // AI Summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: (emailId: string) => emailMetadataApi.generateSummary(emailId),
    onMutate: (emailId) => {
      setGeneratingSummaryId(emailId);
    },
    onSuccess: (response, emailId) => {
      // Update email with the generated summary in kanban store
      updateEmailInColumn(emailId, { summary: response.data.summary });
      setGeneratingSummaryId(null);
    },
    onError: (error) => {
      console.error('Failed to generate summary:', error);
      alert(
        'Failed to generate summary. Please make sure GEMINI_API_KEY is configured on the backend.'
      );
      setGeneratingSummaryId(null);
    },
  });

  const handleGenerateSummary = (emailId: string) => {
    generateSummaryMutation.mutate(emailId);
  };

  // Snooze mutation
  const snoozeMutation = useMutation({
    mutationFn: ({
      emailId,
      snoozeUntil,
    }: {
      emailId: string;
      snoozeUntil: Date;
    }) => emailMetadataApi.snoozeEmail(emailId, snoozeUntil),
    onSuccess: (_, { emailId }) => {
      // Remove from kanban board (email disappears after snooze)
      deleteEmailFromColumn(emailId);
      setSnoozeModalOpen(false);
      setEmailToSnooze(null);
    },
    onError: (error) => {
      console.error('Failed to snooze email:', error);
      alert('Failed to snooze email. Please try again.');
    },
  });

  const handleSnoozeClick = (emailId: string) => {
    // Find email in columns
    const email = columns
      .flatMap((col) => col.emails)
      .find((e) => e.id === emailId);
    if (email) {
      setEmailToSnooze(email);
      setSnoozeModalOpen(true);
    }
  };

  const handleSnooze = (snoozeUntil: Date) => {
    if (emailToSnooze) {
      snoozeMutation.mutate({ emailId: emailToSnooze.id, snoozeUntil });
    }
  };

  const handleEmailClick = async (email: Email) => {
    // Set email immediately for quick feedback
    setSelectedEmail(email);
    setIsMobileDetailOpen(true);

    // Fetch full email data (with attachments) in background
    try {
      const fullEmail = await gmailApi.getEmailById(email.id);
      // Update with full email data including attachments
      setSelectedEmail(fullEmail);
    } catch (error) {
      console.error('Failed to fetch full email:', error);
      // Keep the partial email data if fetch fails
    }
  };

  return (
    <>
      <div className="h-screen flex bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
        {/* Desktop Layout */}
        <div className="hidden md:flex flex-1 overflow-hidden relative">
          {/* Sidebar - No gap */}
          <div className="h-full relative">
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() =>
                setIsSidebarCollapsed(!isSidebarCollapsed)
              }
            />

            {/* Collapse Toggle Button - Positioned at the border */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute top-1/2 -right-4 -translate-y-1/2 z-10 h-10 w-10 rounded-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md hover:bg-gray-100 dark:hover:bg-slate-800/70 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-slate-400 focus:ring-offset-2 cursor-pointer flex items-center justify-center"
            >
              {isSidebarCollapsed ? (
                <svg
                  className="h-5 w-5 text-gray-600 dark:text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-gray-600 dark:text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            <ResizablePanelGroup direction="horizontal">
              {/* Kanban Board */}
              <ResizablePanel
                defaultSize={selectedEmail ? 70 : 100}
                minSize={50}
              >
                <KanbanBoard
                  onEmailClick={handleEmailClick}
                  onGenerateSummary={handleGenerateSummary}
                  generatingSummaryId={generatingSummaryId}
                  onSnooze={handleSnoozeClick}
                />
              </ResizablePanel>

              {/* Email Detail */}
              {selectedEmail && (
                <>
                  <ResizableHandle className="bg-gray-300 dark:bg-slate-800/50" />
                  <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
                    <div className="h-full border-l border-gray-200 dark:border-slate-800">
                      <EmailDetail />
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </div>
        {/* Mobile Layout */}
        <div className="md:hidden flex-1 flex flex-col">
          <KanbanBoard
            onEmailClick={handleEmailClick}
            onGenerateSummary={handleGenerateSummary}
            generatingSummaryId={generatingSummaryId}
            onSnooze={handleSnoozeClick}
          />

          {/* Mobile Email Detail Sheet */}
          <Sheet open={isMobileDetailOpen} onOpenChange={setIsMobileDetailOpen}>
            <SheetContent
              side="right"
              className="w-full p-0 bg-white dark:bg-slate-900"
            >
              {selectedEmail && (
                <EmailDetail
                  isMobile={true}
                  onBack={() => {
                    setSelectedEmail(null);
                    setIsMobileDetailOpen(false);
                  }}
                />
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Snooze Modal - Outside main container for proper portal rendering */}
      <SnoozeModal
        isOpen={snoozeModalOpen}
        onClose={() => {
          setSnoozeModalOpen(false);
          setEmailToSnooze(null);
        }}
        onSnooze={handleSnooze}
        emailSubject={emailToSnooze?.subject}
      />
    </>
  );
}

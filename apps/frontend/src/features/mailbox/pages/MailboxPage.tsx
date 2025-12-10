import { Button } from '@fe/shared/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@fe/shared/components/ui/resizable';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@fe/shared/components/ui/sheet';
import { motion } from 'framer-motion';
import { Menu, LayoutList, LayoutGrid } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { EmailDetail } from '../components/EmailDetail';
import { EmailList } from '../components/EmailList';
import { FilterChips } from '../components/FilterChips';
import { MailboxBackground } from '../components/MailboxBackground';
import { Sidebar } from '../components/Sidebar';
import { Toolbar } from '../components/Toolbar';
import { KanbanBoard } from '../components/KanbanBoard';
import { useMailbox } from '../hooks/useMailbox';
import { Email, useEmailStore, KanbanStatus } from '../store/emailStore';
import { emailMetadataApi } from '../../../services/api/emailMetadataApi';

export function MailboxPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const { mailboxId } = useParams<{ mailboxId: string }>();
  const navigate = useNavigate();
  const {
    searchKeyword,
    setSearchKeyword,
    selectedEmail,
    setSelectedMailbox,
    viewMode,
    setViewMode,
    updateEmail
  } = useEmailStore();
  const { handleEmailSelect, refreshEmails } = useMailbox();

  // Sync URL param to store on mount and when URL changes
  useEffect(() => {
    if (mailboxId) {
      setSelectedMailbox(mailboxId);
    } else {
      // Redirect to INBOX if no mailboxId in URL
      navigate('/inbox/INBOX', { replace: true });
    }
  }, [mailboxId, setSelectedMailbox, navigate]);

  const handleSearchChange = (query: string) => {
    setSearchKeyword(query);
  };

  const handleMobileEmailSelect = (email: Email) => {
    handleEmailSelect(email);
    // On mobile, show detail view when email is selected
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ emailId, status }: { emailId: string; status: KanbanStatus }) =>
      emailMetadataApi.updateKanbanStatus(emailId, status),
    onMutate: ({ emailId, status }) => {
      // Optimistic update
      updateEmail(emailId, { kanbanStatus: status });
    },
    onError: (error, { emailId }) => {
      console.error('Failed to update email status:', error);
      // Revert optimistic update by refetching
      refreshEmails();
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ emailId, snoozeUntil }: { emailId: string; snoozeUntil: Date }) =>
      emailMetadataApi.snoozeEmail(emailId, snoozeUntil),
    onMutate: ({ emailId, snoozeUntil }) => {
      // Optimistic update
      updateEmail(emailId, {
        kanbanStatus: 'snoozed',
        snoozeUntil: snoozeUntil.toISOString(),
      });
    },
    onError: (error) => {
      console.error('Failed to snooze email:', error);
      refreshEmails();
    },
  });

  const generateSummaryMutation = useMutation({
    mutationFn: (emailId: string) => emailMetadataApi.generateSummary(emailId),
    onSuccess: (response, emailId) => {
      // Update email with the generated summary
      updateEmail(emailId, { summary: response.data.summary });
    },
    onError: (error) => {
      console.error('Failed to generate summary:', error);
      alert('Failed to generate summary. Please make sure GEMINI_API_KEY is configured on the backend.');
    },
  });

  const handleEmailStatusChange = (emailId: string, newStatus: KanbanStatus) => {
    updateStatusMutation.mutate({ emailId, status: newStatus });
  };

  const handleEmailSnooze = (emailId: string, snoozeUntil: Date) => {
    snoozeMutation.mutate({ emailId, snoozeUntil });
  };

  const handleGenerateSummary = async (emailId: string) => {
    return generateSummaryMutation.mutateAsync(emailId);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-linear-to-br from-slate-950 via-blue-950/20 to-slate-950">
      {/* Animated Background */}
      <MailboxBackground />

      {/* Desktop: Full 3-column layout */}
      <div className="relative z-10 hidden h-screen w-full lg:flex">
        {/* Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 h-screen overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Email List Panel */}
            <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex h-full flex-col bg-slate-900/50 backdrop-blur-xl border-r border-slate-800"
              >
                <div className="flex items-center gap-2 px-3">
                  <div className="flex-1">
                    <Toolbar
                      searchQuery={searchKeyword}
                      onSearchChange={handleSearchChange}
                      onRefresh={refreshEmails}
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="h-8 w-8 p-0"
                      title="List View"
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('kanban')}
                      className="h-8 w-8 p-0"
                      title="Kanban View"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {viewMode === 'list' && (
                  <>
                    <FilterChips
                      activeFilter={activeFilter}
                      onFilterChange={setActiveFilter}
                    />
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <EmailList
                        onEmailSelect={handleEmailSelect}
                        onRefresh={refreshEmails}
                      />
                    </div>
                  </>
                )}
                {viewMode === 'kanban' && (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <KanbanBoard
                      onEmailClick={handleEmailSelect}
                      onEmailStatusChange={handleEmailStatusChange}
                      onEmailSnooze={handleEmailSnooze}
                      onGenerateSummary={handleGenerateSummary}
                    />
                  </div>
                )}
              </motion.div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-slate-800/50" />

            {/* Email Detail Panel */}
            <ResizablePanel defaultSize={65} minSize={50}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="h-full bg-slate-900/30 backdrop-blur-xl"
              >
                <EmailDetail />
              </motion.div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {/* Mobile & Tablet: Show either list or detail */}
      <div className="relative z-10 flex h-screen w-full lg:hidden">
        {!showMobileDetail || !selectedEmail ? (
          /* Show email list */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-full w-full flex-col bg-slate-900/50 backdrop-blur-xl"
          >
            {/* Mobile Header with Menu Button */}
            <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/80 px-2 py-3">
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-64 p-0 bg-slate-900 border-slate-800"
                >
                  <Sidebar
                    isCollapsed={false}
                    onToggleCollapse={() => {
                      // Mobile sidebar doesn't collapse
                    }}
                    isMobile={true}
                  />
                </SheetContent>
              </Sheet>
              <div className="flex-1 min-w-0">
                <Toolbar
                  searchQuery={searchKeyword}
                  onSearchChange={handleSearchChange}
                  onRefresh={refreshEmails}
                />
              </div>
            </div>
            <FilterChips
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              <EmailList
                onEmailSelect={handleMobileEmailSelect}
                onRefresh={refreshEmails}
                isMobile
              />
            </div>
          </motion.div>
        ) : (
          /* Show email detail */
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full w-full"
          >
            <EmailDetail isMobile onBack={handleBackToList} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

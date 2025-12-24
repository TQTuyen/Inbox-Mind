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
import {
  useFuzzySearch,
  useKanbanEmails,
  useSemanticSearch,
} from '@fe/hooks/useGmailQuery';
import { motion } from 'framer-motion';
import { Menu, LayoutList, LayoutGrid } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { EmailDetail } from '../components/EmailDetail';
import { EmailList } from '../components/EmailList';
import { FilterChips } from '../components/FilterChips';
import { MailboxBackground } from '../components/MailboxBackground';
import { SearchBar } from '../components/SearchBar';
import { SearchResultsView } from '../components/SearchResultsView';
import { Sidebar } from '../components/Sidebar';
import { KanbanBoard as OldKanbanBoard } from '../components/KanbanBoard';
import { useMailbox } from '../hooks/useMailbox';
import { Email, useEmailStore, KanbanStatus } from '../store/emailStore';
import { emailMetadataApi } from '../../../services/api/emailMetadataApi';
import {
  transformKanbanEmailsBatch,
  transformSearchResultsBatch,
} from '@fe/utils/emailTransformers';

export function MailboxPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const { mailboxId } = useParams<{ mailboxId: string }>();
  const navigate = useNavigate();
  const {
    selectedEmail,
    setSelectedMailbox,
    isSearchMode,
    searchQuery,
    setSearchMode,
    setSearchQuery,
    setSearchResults,
    clearSearch,
    viewMode,
    setViewMode,
    updateEmail,
    setEmails,
  } = useEmailStore();
  const { handleEmailSelect, refreshEmails } = useMailbox();

  // Fetch Kanban emails when in Kanban view
  const {
    data: kanbanEmailsData = [],
    isLoading: isLoadingKanbanEmails,
    refetch: refetchKanbanEmails,
  } = useKanbanEmails({
    enabled: viewMode === 'kanban', // Only fetch when in Kanban view
  });

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [isSemanticMode, setIsSemanticMode] = useState(false);

  // Fuzzy search
  const { data: fuzzyData, isLoading: isFuzzyLoading } = useFuzzySearch(
    {
      query: searchQuery,
      mailboxId: mailboxId || 'INBOX',
      limit: 20,
    },
    { enabled: searchQuery.length >= 2 && !isSemanticMode }
  );

  // Semantic search
  const { data: semanticData, isLoading: isSemanticLoading } =
    useSemanticSearch(
      {
        query: searchQuery,
        limit: 20,
        threshold: 0.7,
      },
      { enabled: searchQuery.length >= 2 && isSemanticMode }
    );

  const isSearchLoading = isFuzzyLoading || isSemanticLoading;
  const searchData = isSemanticMode ? semanticData : fuzzyData;

  // Sync URL param to store on mount and when URL changes
  useEffect(() => {
    if (mailboxId) {
      setSelectedMailbox(mailboxId);
    } else {
      // Redirect to INBOX if no mailboxId in URL
      navigate('/inbox/INBOX', { replace: true });
    }
  }, [mailboxId, setSelectedMailbox, navigate]);

  // Update search results when search data changes
  useEffect(() => {
    if (searchData?.results) {
      // Transform search results to Email format using centralized utility
      const transformedResults = transformSearchResultsBatch(
        searchData.results,
        mailboxId || 'INBOX'
      );
      setSearchResults(transformedResults);
    }
  }, [searchData, setSearchResults, mailboxId, isSemanticMode]);

  // Sync Kanban emails to store when in Kanban view
  useEffect(() => {
    if (viewMode === 'kanban' && kanbanEmailsData.length > 0) {
      console.log(
        '🔄 [KANBAN] Syncing Kanban emails to store:',
        kanbanEmailsData.length,
        'emails'
      );
      // Transform API emails to store Email format using centralized utility
      const transformedEmails = transformKanbanEmailsBatch(kanbanEmailsData);
      setEmails(transformedEmails, 1);
    }
  }, [viewMode, kanbanEmailsData, setEmails]);

  // Refetch Kanban emails when switching to Kanban view
  useEffect(() => {
    if (viewMode === 'kanban') {
      console.log(
        '🔄 [KANBAN] Switching to Kanban view - refetching Kanban emails from all columns'
      );
      refetchKanbanEmails();
    }
  }, [viewMode, refetchKanbanEmails]);

  const handleSearch = (query: string, isSemanticSearch = false) => {
    setSearchQuery(query);
    setSearchMode(true);
    setIsSemanticMode(isSemanticSearch);
  };

  const handleClearSearch = () => {
    clearSearch();
    setSearchInput('');
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
    mutationFn: ({
      emailId,
      status,
    }: {
      emailId: string;
      status: KanbanStatus;
    }) => {
      console.log('🔵 [MUTATION] Starting updateKanbanStatus mutation:', {
        emailId,
        status,
      });
      return emailMetadataApi.updateKanbanStatus(emailId, status);
    },
    onMutate: ({ emailId, status }) => {
      console.log('🟡 [MUTATION] onMutate - Optimistic update:', {
        emailId,
        status,
      });
      // Optimistic update
      updateEmail(emailId, { kanbanStatus: status });
    },
    onSuccess: (data, { emailId, status }) => {
      console.log('🟢 [MUTATION] onSuccess - Status updated successfully:', {
        emailId,
        status,
        data,
      });
      // Refetch Kanban emails if in Kanban view to get latest data
      if (viewMode === 'kanban') {
        console.log(
          '🔄 [MUTATION] Refetching Kanban emails after status update'
        );
        refetchKanbanEmails();
      }
    },
    onError: (error, { emailId, status }) => {
      console.error('🔴 [MUTATION] onError - Failed to update email status:', {
        emailId,
        status,
        error,
      });
      // Revert optimistic update by refetching
      refreshEmails();
    },
    onSettled: (data, error, { emailId, status }) => {
      console.log('⚪ [MUTATION] onSettled - Mutation completed:', {
        emailId,
        status,
        success: !error,
      });
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: ({
      emailId,
      snoozeUntil,
    }: {
      emailId: string;
      snoozeUntil: Date;
    }) => emailMetadataApi.snoozeEmail(emailId, snoozeUntil),
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
      alert(
        'Failed to generate summary. Please make sure GEMINI_API_KEY is configured on the backend.'
      );
    },
  });

  const handleEmailStatusChange = (
    emailId: string,
    newStatus: KanbanStatus
  ) => {
    console.log('🎯 [DRAG] handleEmailStatusChange called:', {
      emailId,
      newStatus,
    });
    updateStatusMutation.mutate({ emailId, status: newStatus });
  };

  const handleEmailSnooze = (emailId: string, snoozeUntil: Date) => {
    snoozeMutation.mutate({ emailId, snoozeUntil });
  };

  const handleGenerateSummary = async (emailId: string) => {
    return generateSummaryMutation.mutateAsync(emailId);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
      {/* Animated Background */}
      <MailboxBackground />

      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

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
                className="flex h-full flex-col bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl border-r border-gray-200 dark:border-slate-800"
              >
                {/* Header with Search and View Toggle */}
                <div className="shrink-0 border-b border-gray-200 dark:border-slate-800">
                  <div className="p-4">
                    <SearchBar
                      onSearch={handleSearch}
                      isLoading={isSearchLoading}
                    />
                  </div>

                  {!isSearchMode && (
                    <div className="flex items-center justify-between gap-2 px-4 pb-3">
                      <div className="flex items-center gap-1 !bg-gray-100 dark:!bg-slate-700/50 rounded-lg p-1 shadow-sm">
                        <Button
                          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => setViewMode('list')}
                          className="h-8 w-8 p-0 text-gray-700 dark:text-slate-300"
                          title="List View"
                        >
                          <LayoutList className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={
                            viewMode === 'kanban' ? 'secondary' : 'ghost'
                          }
                          size="sm"
                          onClick={() => setViewMode('kanban')}
                          className="h-8 w-8 p-0 text-gray-700 dark:text-slate-300"
                          title="Kanban View"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Mode */}
                {isSearchMode && (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <SearchResultsView
                      onBack={handleClearSearch}
                      onEmailSelect={handleEmailSelect}
                    />
                  </div>
                )}

                {/* Normal Mode */}
                {!isSearchMode && (
                  <>
                    {/* List View */}
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

                    {/* Kanban View */}
                    {viewMode === 'kanban' && (
                      <div className="flex-1 min-h-0 overflow-hidden">
                        <OldKanbanBoard
                          onEmailClick={handleEmailSelect}
                          onEmailStatusChange={handleEmailStatusChange}
                          onEmailSnooze={handleEmailSnooze}
                          onGenerateSummary={handleGenerateSummary}
                        />
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </ResizablePanel>

            <ResizableHandle
              withHandle
              className="bg-gray-300 dark:bg-slate-800/50"
            />

            {/* Email Detail Panel */}
            <ResizablePanel defaultSize={65} minSize={50}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="h-full bg-gray-50/30 dark:bg-slate-900/30 backdrop-blur-xl"
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
            className="flex h-full w-full flex-col bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl"
          >
            {/* Mobile Header with Menu Button */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 bg-gray-100/80 dark:bg-slate-900/80 px-2 py-3">
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-64 p-0 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800"
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
              <div className="flex-1 min-w-0 px-2">
                <SearchBar
                  onSearch={handleSearch}
                  isLoading={isSearchLoading}
                />
              </div>
            </div>
            {!isSearchMode && (
              <>
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
              </>
            )}
            {isSearchMode && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <SearchResultsView
                  onBack={handleClearSearch}
                  onEmailSelect={handleMobileEmailSelect}
                />
              </div>
            )}
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

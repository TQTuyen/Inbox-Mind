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
import { useFuzzySearch } from '@fe/hooks/useGmailQuery';
import { motion } from 'framer-motion';
import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmailDetail } from '../components/EmailDetail';
import { EmailList } from '../components/EmailList';
import { FilterChips } from '../components/FilterChips';
import { MailboxBackground } from '../components/MailboxBackground';
import { SearchBar } from '../components/SearchBar';
import { SearchResultsView } from '../components/SearchResultsView';
import { Sidebar } from '../components/Sidebar';
import { Toolbar } from '../components/Toolbar';
import { useMailbox } from '../hooks/useMailbox';
import { Email, useEmailStore } from '../store/emailStore';

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
    isSearchMode,
    searchQuery,
    setSearchMode,
    setSearchQuery,
    setSearchResults,
    clearSearch,
  } = useEmailStore();
  const { handleEmailSelect, refreshEmails } = useMailbox();

  // Fuzzy search state
  const [searchInput, setSearchInput] = useState('');
  const { data: searchData, isLoading: isSearchLoading } = useFuzzySearch(
    {
      query: searchQuery,
      mailboxId: mailboxId || 'INBOX',
      limit: 20,
    },
    { enabled: searchQuery.length >= 2 }
  );

  // Sync URL param to store on mount and when URL changes
  useEffect(() => {
    if (mailboxId) {
      setSelectedMailbox(mailboxId);
    } else {
      // Redirect to INBOX if no mailboxId in URL
      navigate('/inbox/INBOX', { replace: true });
    }
  }, [mailboxId, setSelectedMailbox, navigate]);

  // Update search results when fuzzy search data changes
  useEffect(() => {
    if (searchData?.results) {
      // Transform search results to Email format
      const transformedResults: Email[] = searchData.results.map((result) => ({
        id: result.id,
        subject: result.subject,
        from: result.from,
        to: [], // Not provided in search results
        preview: result.snippet,
        body: result.snippet,
        timestamp: result.timestamp,
        isRead: result.isRead,
        isStarred: false,
        attachments: result.hasAttachments ? [] : undefined,
        mailboxId: mailboxId || 'INBOX',
      }));
      setSearchResults(transformedResults);
    }
  }, [searchData, setSearchResults, mailboxId]);

  const handleSearchChange = (query: string) => {
    setSearchKeyword(query);
  };

  const handleFuzzySearch = (query: string) => {
    setSearchQuery(query);
    setSearchMode(true);
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
                <div className="p-4 border-b border-slate-800">
                  <SearchBar
                    onSearch={handleFuzzySearch}
                    isLoading={isSearchLoading}
                  />
                </div>
                {!isSearchMode && (
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
                {isSearchMode && (
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <SearchResultsView
                      onBack={handleClearSearch}
                      onEmailSelect={handleEmailSelect}
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
              <div className="flex-1 min-w-0 px-2">
                <SearchBar
                  onSearch={handleFuzzySearch}
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

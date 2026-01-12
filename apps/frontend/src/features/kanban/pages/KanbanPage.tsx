import { EmailDetail } from '@fe/features/mailbox/components/EmailDetail';
import { Sidebar } from '@fe/features/mailbox/components/Sidebar';
import { Email, useEmailStore } from '@fe/features/mailbox/store/emailStore';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@fe/shared/components/ui/resizable';
import { Sheet, SheetContent } from '@fe/shared/components/ui/sheet';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KanbanBoard } from '../components/KanbanBoard';
import { useKanban } from '../hooks/useKanban';

export function KanbanPage() {
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const { selectedEmail, setSelectedEmail } = useEmailStore();

  // Initialize kanban hook
  useKanban();

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    setIsMobileDetailOpen(true);
  };

  return (
    <div className="h-screen flex bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100 dark:from-slate-950 dark:via-blue-950/20 dark:to-slate-950">
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1 overflow-hidden relative">
        {/* Sidebar - No gap */}
        <div className="h-full relative">
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
            <ResizablePanel defaultSize={selectedEmail ? 70 : 100} minSize={50}>
              <KanbanBoard onEmailClick={handleEmailClick} />
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
        <KanbanBoard onEmailClick={handleEmailClick} />

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
  );
}

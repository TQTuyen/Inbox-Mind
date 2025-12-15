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
import { KanbanBoard } from '../components/KanbanBoard';
import { useKanban } from '../hooks/useKanban';

export function KanbanPage() {
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { selectedEmail, setSelectedEmail } = useEmailStore();

  // Initialize kanban hook
  useKanban();

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    setIsMobileDetailOpen(true);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Desktop Layout */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full border-r">
              <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Kanban Board */}
          <ResizablePanel defaultSize={selectedEmail ? 50 : 80} minSize={40}>
            <KanbanBoard onEmailClick={handleEmailClick} />
          </ResizablePanel>

          {/* Email Detail */}
          {selectedEmail && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
                <div className="h-full border-l">
                  <EmailDetail />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden flex-1 flex flex-col">
        <KanbanBoard onEmailClick={handleEmailClick} />

        {/* Mobile Email Detail Sheet */}
        <Sheet
          open={isMobileDetailOpen}
          onOpenChange={setIsMobileDetailOpen}
        >
          <SheetContent side="right" className="w-full p-0">
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

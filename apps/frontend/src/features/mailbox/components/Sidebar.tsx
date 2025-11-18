import { cn } from '@fe/lib/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@fe/shared/components/ui/avatar';
import { Button } from '@fe/shared/components/ui/button';
import { ScrollArea } from '@fe/shared/components/ui/scroll-area';
import { Separator } from '@fe/shared/components/ui/separator';
import { motion } from 'framer-motion';
import {
  AlertOctagon,
  Archive,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  Inbox,
  Newspaper,
  PenSquare,
  Send,
  Settings,
  Star,
  Tag,
  Trash2,
} from 'lucide-react';
import { useEmailStore } from '../store/emailStore';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
}

const mailboxItems = [
  { id: 'inbox', name: 'Inbox', icon: Inbox },
  { id: 'starred', name: 'Important', icon: Star },
  { id: 'newsletter', name: 'Newsletter', icon: Newspaper },
  { id: 'promotions', name: 'Promotions', icon: Tag },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'sent', name: 'Sent', icon: Send },
  { id: 'drafts', name: 'Drafts', icon: FileText },
  { id: 'archive', name: 'Archive', icon: Archive },
  { id: 'spam', name: 'Spam', icon: AlertOctagon },
  { id: 'trash', name: 'Bin', icon: Trash2 },
  { id: 'work', name: 'Work Project', icon: Folder },
];

export function Sidebar({ isCollapsed, onToggleCollapse, isMobile = false }: SidebarProps) {
  const { selectedMailboxId, setSelectedMailbox, mailboxes } = useEmailStore();

  const getUnreadCount = (mailboxId: string) => {
    const mailbox = mailboxes.find((m) => m.id === mailboxId);
    return mailbox?.unreadCount || 0;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex h-full shrink-0 flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl"
    >
      <div className="flex h-full flex-col justify-between p-4">
        <div className="flex flex-col gap-4">
          {!isMobile && (
            <div className="flex justify-center">
              {/* Collapse Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-10 w-10 rounded-full border border-slate-700 bg-slate-900 shadow-md
              hover:bg-slate-800/70 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-10 w-10 text-slate-400" />
                ) : (
                  <ChevronLeft className="h-10 w-10 text-slate-400" />
                )}
                </Button>
            </div>
          )}

          {/* User Avatar - Always Visible */}
          <div className="flex justify-center">
            <Avatar className="h-10 w-10">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=MinhNguyen" />
              <AvatarFallback>MN</AvatarFallback>
            </Avatar>
          </div>

          {/* User Info - Only when expanded */}
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-2 -mt-2"
            >
              <h1 className="text-sm font-medium leading-normal text-white text-center">
                Tran Quang Tuyen
              </h1>
              <p className="text-xs font-normal leading-normal text-slate-400 truncate text-center">
                tranquangtuyen@email.com
              </p>
            </motion.div>
          )}

          {/* New Email Button - Always Visible */}
          <div className="flex justify-center">
            {isCollapsed ? (
              <Button
                className="h-10 w-10 p-0 bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                size="icon"
                title="New Email"
              >
                <PenSquare className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                className="h-8 w-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                size="default"
              >
                <PenSquare className="mr-2 h-4 w-4" />
                New Email
              </Button>
            )}
          </div>

          {/* Mailbox Navigation */}
          <ScrollArea className="flex-1">
            <nav className="flex flex-col gap-1">
              {mailboxItems.map((item) => {
                const Icon = item.icon;
                const isActive = selectedMailboxId === item.id;
                const unreadCount = getUnreadCount(item.id);

                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMailbox(item.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-900 text-blue-300'
                        : 'text-slate-300 hover:bg-blue-900/50 hover:text-white',
                      isCollapsed && 'justify-center px-2'
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        isActive ? 'text-blue-300' : ''
                      )}
                    />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.name}</span>
                        {unreadCount > 0 && (
                          <span className="text-xs font-semibold text-blue-400">
                            {unreadCount}
                          </span>
                        )}
                      </>
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </ScrollArea>
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-1">
          <Separator className="mb-2 bg-slate-800" />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-blue-900/50 hover:text-white',
              isCollapsed && 'justify-center px-2'
            )}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </motion.button>
        </div>
      </div>
    </motion.aside>
  );
}

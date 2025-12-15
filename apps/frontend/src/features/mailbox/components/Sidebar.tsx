import { cn } from '@fe/lib/utils';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@fe/shared/components/ui/avatar';
import { Button } from '@fe/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@fe/shared/components/ui/dropdown-menu';
import { ScrollArea } from '@fe/shared/components/ui/scroll-area';
import { useAuthStore } from '@fe/store/authStore';
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
  Kanban,
  LogOut,
  Newspaper,
  PenSquare,
  Send,
  Settings,
  Star,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEmailStore } from '../store/emailStore';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
}

// Map Gmail label IDs to appropriate icons
const getMailboxIcon = (labelId: string, labelName: string) => {
  const upperLabelId = labelId.toUpperCase();
  const lowerLabelName = labelName.toLowerCase();

  // Standard Gmail labels
  if (upperLabelId === 'INBOX') return Inbox;
  if (upperLabelId === 'STARRED' || upperLabelId === 'IMPORTANT') return Star;
  if (upperLabelId === 'SENT') return Send;
  if (upperLabelId === 'DRAFT' || upperLabelId === 'DRAFTS') return FileText;
  if (upperLabelId === 'TRASH') return Trash2;
  if (upperLabelId === 'SPAM') return AlertOctagon;

  // Category labels based on name
  if (lowerLabelName.includes('newsletter')) return Newspaper;
  if (lowerLabelName.includes('promotion')) return Tag;
  if (lowerLabelName.includes('notification')) return Bell;
  if (lowerLabelName.includes('archive')) return Archive;
  if (lowerLabelName.includes('work') || lowerLabelName.includes('project'))
    return Folder;

  // Default icon for custom labels
  return Folder;
};

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobile = false,
}: SidebarProps) {
  const navigate = useNavigate();
  const { selectedMailboxId, mailboxes } = useEmailStore();
  const { logout } = useAuthStore();
  // Use mailboxes from store (populated by useMailbox hook)
  const mailboxItems = mailboxes.map((mailbox) => ({
    id: mailbox.id,
    name: mailbox.name,
    icon: getMailboxIcon(mailbox.id, mailbox.name),
    unreadCount: mailbox.unreadCount || 0,
  }));

  const handleLogout = () => {
    logout();
  };

  const handleMailboxClick = (mailboxId: string) => {
    navigate(`/inbox/${mailboxId}`);
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
                hover:bg-slate-800/70 focus:outline-none focus:ring-2 focus:ring-slate-400
                  focus:ring-offset-2 cursor-pointer"
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-10 w-10 cursor-pointer">
                  <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=MinhNguyen" />
                  <AvatarFallback>MN</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-slate-900 border-slate-700 text-slate-300"
                align="center"
                forceMount
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-white">
                      Tran Quang Tuyen
                    </p>
                    <p className="text-xs leading-none text-slate-400">
                      tranquangtuyen@email.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem className="hover:bg-slate-800 cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-slate-800 cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  className="hover:bg-slate-800 cursor-pointer"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                className="h-10 w-10 p-0 bg-blue-500 hover:bg-blue-600 text-white
                shadow-lg shadow-blue-500/30 cursor-pointer"
                size="icon"
                title="New Email"
              >
                <PenSquare className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                className="h-8 w-full bg-blue-500 hover:bg-blue-600 text-white
                shadow-lg shadow-blue-500/30 cursor-pointer"
                size="default"
              >
                <PenSquare className="mr-2 h-4 w-4" />
                New Email
              </Button>
            )}
          </div>

          {/* View Switcher */}
          <div className="flex justify-center">
            {isCollapsed ? (
              <Button
                variant="outline"
                className="h-10 w-10 p-0 border-slate-700 hover:bg-slate-800 cursor-pointer"
                size="icon"
                title="Kanban View"
                onClick={() => navigate('/kanban')}
              >
                <Kanban className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-8 w-full border-slate-700 hover:bg-slate-800 cursor-pointer"
                size="default"
                onClick={() => navigate('/kanban')}
              >
                <Kanban className="mr-2 h-4 w-4" />
                Kanban View
              </Button>
            )}
          </div>

          {/* Mailbox Navigation */}
          <ScrollArea className="flex-1">
            <nav className="flex flex-col gap-1">
              {mailboxItems.length > 0 ? (
                mailboxItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = selectedMailboxId === item.id;
                  const unreadCount = item.unreadCount;

                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMailboxClick(item.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
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
                })
              ) : (
                <div className="text-xs text-slate-400 px-3 py-2">
                  Loading mailboxes...
                </div>
              )}
            </nav>
          </ScrollArea>
        </div>
      </div>
    </motion.aside>
  );
}

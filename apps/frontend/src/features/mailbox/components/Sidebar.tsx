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
import { useState } from 'react';
import { ComposeModal } from './ComposeModal';
import { useEmailStore } from '../store/emailStore';
import { useSendEmail } from '@fe/hooks/useGmailQuery';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse?: () => void;
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
  const { logout, user } = useAuthStore();
  const sendEmailMutation = useSendEmail();

  // Get user info with fallback
  const userName =
    user?.fullName?.trim() || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const userInitials = (user?.fullName?.trim() || user?.email || 'U')
    .split(/[\s@]/)
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Use mailboxes from store (populated by useMailbox hook)
  const mailboxItems = mailboxes.map((mailbox) => ({
    id: mailbox.id,
    name: mailbox.name,
    icon: getMailboxIcon(mailbox.id, mailbox.name),
    unreadCount: mailbox.unreadCount || 0,
  }));

  const [showCompose, setShowCompose] = useState(false);

  const handleLogout = () => {
    logout();
  };

  // Kanban-related labels that should redirect to Kanban view
  const kanbanLabelIds = ['Label_1', 'Label_2', 'Label_3']; // To Do, In Progress, Done
  const kanbanLabelNames = ['to do', 'in progress', 'done'];

  const handleMailboxClick = (mailboxId: string, mailboxName: string) => {
    // Check if this is a Kanban-related label
    const isKanbanLabel =
      kanbanLabelIds.includes(mailboxId) ||
      kanbanLabelNames.includes(mailboxName.toLowerCase());

    if (isKanbanLabel) {
      // Redirect to Kanban view for kanban-related labels
      navigate('/kanban');
    } else {
      navigate(`/inbox/${mailboxId}`);
    }
  };

  // Handler for New Email button
  const handleNewEmail = () => {
    setShowCompose(true);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex h-full shrink-0 flex-col border-r border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl"
    >
      <div className="flex h-full flex-col p-4">
        {/* Top Section - Fixed */}
        <div className="flex flex-col gap-4 shrink-0">
          {/* User Avatar - Always Visible */}
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-10 w-10 cursor-pointer border-2 border-gray-200 dark:border-slate-700">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`}
                  />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-300"
                align="center"
                forceMount
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-gray-900 dark:text-gray-100">
                      {userName}
                    </p>
                    <p className="text-xs leading-none text-gray-500 dark:text-slate-400">
                      {userEmail}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200 dark:bg-slate-700" />
                <DropdownMenuItem
                  className="hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
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
            <div className="px-2 -mt-2">
              <h1 className="text-sm font-medium leading-normal text-gray-900 dark:text-gray-100 text-center">
                {userName}
              </h1>
              <p className="text-xs font-normal leading-normal text-gray-500 dark:text-slate-400 truncate text-center">
                {userEmail}
              </p>
            </div>
          )}

          {/* New Email Button - Always Visible */}
          <div className="flex justify-center">
            {isCollapsed ? (
              <Button
                className="h-10 w-10 p-0 bg-blue-500 hover:bg-blue-600 text-white
                shadow-lg shadow-blue-500/30 cursor-pointer"
                size="icon"
                title="New Email"
                onClick={handleNewEmail}
              >
                <PenSquare className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                className="h-8 w-full bg-blue-500 hover:bg-blue-600 text-white
                shadow-lg shadow-blue-500/30 cursor-pointer"
                size="default"
                onClick={handleNewEmail}
              >
                <PenSquare className="mr-2 h-4 w-4" />
                New Email
              </Button>
            )}
          </div>

          {/* Compose Modal for New Email */}
          <ComposeModal
            isOpen={showCompose}
            onClose={() => setShowCompose(false)}
            mode="compose"
            originalEmail={undefined}
            onSend={async (data) => {
              await sendEmailMutation.mutateAsync({
                to: data.to,
                subject: data.subject,
                body: data.body,
                cc: data.cc || undefined,
              });
            }}
          />

          {/* View Switcher */}
          <div className="flex justify-center gap-2">
            {isCollapsed ? (
              <Button
                variant="outline"
                className="h-10 w-10 p-0 !bg-white dark:!bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:!bg-gray-100 dark:hover:!bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
                size="icon"
                title="Kanban View"
                onClick={() => navigate('/kanban')}
              >
                <Kanban className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                className="h-8 w-full !bg-white dark:!bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:!bg-gray-100 dark:hover:!bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer"
                size="default"
                onClick={() => navigate('/kanban')}
              >
                <Kanban className="mr-2 h-4 w-4" />
                Kanban View
              </Button>
            )}
          </div>
        </div>

        {/* Bottom Section - Mailbox Navigation (Dynamic/Scrollable) */}
        <ScrollArea className="flex-1 min-h-0">
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
                    onClick={() => handleMailboxClick(item.id, item.name)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                      isActive
                        ? 'bg-blue-900 text-blue-300'
                        : 'text-gray-700 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:text-blue-700 dark:hover:text-white',
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
              <div className="text-xs text-gray-500 dark:text-slate-400 px-3 py-2">
                Loading mailboxes...
              </div>
            )}
          </nav>
        </ScrollArea>
      </div>
    </motion.aside>
  );
}

import { cn } from '@fe/lib/utils';
import { emailService } from '@fe/services/emailService'; // Import emailService
import { Badge } from '@fe/shared/components/ui/badge';
import { Button } from '@fe/shared/components/ui/button';
import { Checkbox } from '@fe/shared/components/ui/checkbox';
import { ScrollArea } from '@fe/shared/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Loader2,
  Mail,
  MailOpen,
  MoreVertical,
  Paperclip,
  RefreshCw,
  Star,
  Trash,
} from 'lucide-react'; // Added MailOpen, Trash, MoreVertical, and Loader2
import { useEffect, useRef, useState } from 'react';
import { useMailbox } from '../hooks/useMailbox';
import { useEmailStore, type Email } from '../store/emailStore';

interface EmailListProps {
  onEmailSelect: (email: Email) => void;
  onRefresh: () => void;
  isMobile?: boolean;
}

export const EmailList = ({ onEmailSelect, onRefresh }: EmailListProps) => {
  const { emails, selectedEmail, updateEmail, deleteEmail } = useEmailStore();

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = useMailbox();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false); // New state for processing

  // Intersection observer ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll implementation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleSelectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`Delete ${selectedIds.size} emails?`)) {
      setIsProcessing(true);
      try {
        await Promise.all(
          Array.from(selectedIds).map((id) => emailService.deleteEmail(id))
        );
        selectedIds.forEach((id) => deleteEmail(id));
        setSelectedIds(new Set());
      } catch (error) {
        console.error('Failed to bulk delete emails:', error);
        alert('Failed to delete emails. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleBulkMarkAsRead = async () => {
    setIsProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => emailService.markAsRead(id))
      );
      selectedIds.forEach((id) => updateEmail(id, { isRead: true }));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to bulk mark as read:', error);
      alert('Failed to mark emails as read. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkMarkAsUnread = async () => {
    setIsProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => emailService.markAsUnread(id))
      );
      selectedIds.forEach((id) => updateEmail(id, { isRead: false }));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to bulk mark as unread:', error);
      alert('Failed to mark emails as unread. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      } else if (diffInHours < 48) {
        return 'Yesterday';
      } else if (diffInHours < 168) {
        return `${Math.floor(diffInHours / 24)}d ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Compact Toolbar */}
      <div className="shrink-0 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/80 px-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            aria-label="Refresh"
            className="h-7 w-7 text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
            disabled={isProcessing}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {selectedIds.size > 0 ? (
            <>
              <span className="text-xs text-gray-600 dark:text-slate-400">
                {selectedIds.size} selected
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-7 text-xs text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                disabled={isProcessing}
              >
                Clear
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                className="h-7 text-xs cursor-pointer"
                disabled={isProcessing}
                title="Delete"
              >
                <Trash className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Delete</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
                    disabled={isProcessing}
                    title="More actions"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="bg-white dark:bg-slate-800 border-gray-200 dark:border-blue-700 text-gray-900 dark:text-slate-300 relative z-60 p-2 top-3 rounded-md shadow-md
                  space-y-1"
                  align="end"
                >
                  <DropdownMenuItem
                    onClick={handleBulkMarkAsRead}
                    disabled={isProcessing}
                    className="flex items-center bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-500
                    cursor-pointer pl-2 pr-2"
                  >
                    <Mail className="h-3.5 w-3.5 mr-2" />
                    Mark as Read
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleBulkMarkAsUnread}
                    disabled={isProcessing}
                    className="flex items-center bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-500
                    cursor-pointer pl-2 pr-2"
                  >
                    <MailOpen className="h-3.5 w-3.5 mr-2" />
                    Mark as Unread
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-7 text-xs text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white cursor-pointer"
              disabled={isProcessing}
            >
              Select All
            </Button>
          )}
        </div>
      </div>

      {/* Email List with ScrollArea */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {emails.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-64 text-slate-500"
            >
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No emails found</p>
              </div>
            </motion.div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-slate-800">
              <AnimatePresence initial={false}>
                {emails.map((email, index) => (
                  <motion.li
                    key={email.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.15, delay: index * 0.015 }}
                    className={cn(
                      'group hover:bg-gray-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer',
                      selectedEmail?.id === email.id && 'bg-gray-200 dark:bg-slate-800/70',
                      !email.isRead && 'bg-primary/5'
                    )}
                    onClick={() => onEmailSelect(email)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-2 px-3 py-2.5">
                      {/* Checkbox */}
                      <div
                        className="pt-0.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedIds.has(email.id)}
                          onCheckedChange={() => toggleSelect(email.id)}
                          className="h-3.5 w-3.5"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <p
                            className={cn(
                              'text-xs font-medium truncate',
                              !email.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-slate-300'
                            )}
                          >
                            {email.from.name}
                          </p>
                          <span className="text-[10px] text-gray-500 dark:text-slate-500 whitespace-nowrap shrink-0">
                            {formatTimestamp(email.timestamp)}
                          </span>
                        </div>

                        <p
                          className={cn(
                            'text-xs truncate',
                            !email.isRead
                              ? 'font-medium text-gray-800 dark:text-slate-100'
                              : 'text-gray-500 dark:text-slate-400'
                          )}
                        >
                          {email.subject}
                        </p>

                        <p className="text-[11px] text-gray-500 dark:text-slate-500 line-clamp-1 mt-0.5">
                          {email.preview}
                        </p>

                        {email.attachments && email.attachments.length > 0 && (
                          <Badge
                            variant="secondary"
                            className="mt-1 h-4 gap-0.5 text-[10px] bg-slate-800 text-slate-400 px-1.5"
                          >
                            <Paperclip className="h-2.5 w-2.5" />
                            {email.attachments.length}
                          </Badge>
                        )}
                      </div>

                      {/* Star */}
                      <div className="shrink-0 pt-0.5">
                        <motion.button
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateEmail(email.id, {
                              isStarred: !email.isStarred,
                            });
                          }}
                          className="p-1 rounded hover:bg-slate-700"
                        >
                          <Star
                            className={cn(
                              'h-3.5 w-3.5 transition-colors',
                              email.isStarred
                                ? 'fill-primary text-primary'
                                : 'text-slate-600 opacity-0 group-hover:opacity-100'
                            )}
                          />
                        </motion.button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>

              {/* Infinite Scroll Trigger */}
              {hasNextPage && (
                <div
                  ref={loadMoreRef}
                  className="flex items-center justify-center py-4"
                >
                  {isFetchingNextPage ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading more emails...</span>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs">
                      Scroll for more
                    </div>
                  )}
                </div>
              )}

              {/* End of list indicator */}
              {!hasNextPage && emails.length > 0 && (
                <div className="flex items-center justify-center py-4">
                  <div className="text-slate-500 text-xs">No more emails</div>
                </div>
              )}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

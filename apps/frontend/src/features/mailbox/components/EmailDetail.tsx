import { useEmailStore } from '@fe/features/mailbox/store/emailStore';
import { cn } from '@fe/lib/utils';
import { emailService } from '@fe/services/emailService';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@fe/shared/components/ui/avatar';
import { Badge } from '@fe/shared/components/ui/badge';
import { Button } from '@fe/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@fe/shared/components/ui/dropdown-menu';
import { ScrollArea } from '@fe/shared/components/ui/scroll-area';
import { motion } from 'framer-motion';
import {
  Archive,
  ArrowLeft,
  ChevronDown,
  Clock,
  Download,
  Edit,
  FileText,
  Forward,
  MoreVertical,
  Reply,
  ReplyAll,
  Star,
  Trash,
  MailOpen, // Added MailOpen
} from 'lucide-react';
import { useState } from 'react';

interface EmailDetailProps {
  isMobile?: boolean;
  onBack?: () => void;
}

interface TaskInfo {
  isTask: boolean;
  status?: 'todo' | 'doing' | 'done';
  deadline?: string;
}

export const EmailDetail = ({ isMobile = false, onBack }: EmailDetailProps) => {
  const { selectedEmail, updateEmail, deleteEmail, setSelectedEmail } =
    useEmailStore();
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock task info - in real app this would come from the email data
  const taskInfo: TaskInfo = {
    isTask: selectedEmail?.id === 'email-1', // Demo: first email is a task
    status: 'doing',
    deadline: '2024-11-25',
  };

  if (!selectedEmail) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 bg-background flex items-center justify-center h-full"
      >
        <div className="text-center text-muted-foreground">
          <FileText className="w-24 h-24 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-lg font-medium">No email selected</p>
          <p className="text-sm mt-1">Select an email to view its contents</p>
        </div>
      </motion.div>
    );
  }

  const handleDelete = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm('Are you sure you want to delete this email?')) {
      setIsProcessing(true);
      try {
        await emailService.deleteEmail(selectedEmail.id);
        deleteEmail(selectedEmail.id);
        setSelectedEmail(null);
        if (onBack) onBack();
      } catch (error) {
        console.error('Failed to delete email:', error);
        alert('Failed to delete email. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleToggleStar = async () => {
    setIsProcessing(true);
    try {
      await emailService.toggleStar(selectedEmail.id, !selectedEmail.isStarred);
      updateEmail(selectedEmail.id, { isStarred: !selectedEmail.isStarred });
    } catch (error) {
      console.error('Failed to toggle star:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsRead = async (isRead: boolean) => {
    setIsProcessing(true);
    try {
      if (isRead) {
        await emailService.markAsRead(selectedEmail.id);
      } else {
        await emailService.markAsUnread(selectedEmail.id);
      }
      updateEmail(selectedEmail.id, { isRead });
    } catch (error) {
      console.error('Failed to update read status:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddNote = async () => {
    if (note.trim()) {
      setIsProcessing(true);
      try {
        await emailService.addNote(selectedEmail.id, note);
        updateEmail(selectedEmail.id, { note });
        setNote('');
        setShowNoteInput(false);
      } catch (error) {
        console.error('Failed to add note:', error);
        alert('Failed to add note. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleMoveToSpam = async () => {
    setIsProcessing(true);
    try {
      await emailService.moveToMailbox(selectedEmail.id, 'spam');
      updateEmail(selectedEmail.id, { mailboxId: 'spam' });
      setSelectedEmail(null);
      if (onBack) onBack();
    } catch (error) {
      console.error('Failed to move to spam:', error);
      alert('Failed to move to spam. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchive = async () => {
    setIsProcessing(true);
    try {
      await emailService.moveToMailbox(selectedEmail.id, 'archive');
      updateEmail(selectedEmail.id, { mailboxId: 'archive' });
      setSelectedEmail(null);
      if (onBack) onBack();
    } catch (error) {
      console.error('Failed to archive:', error);
      alert('Failed to archive. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col overflow-hidden bg-slate-900/30 backdrop-blur-xl"
    >
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-3">
        <div className="flex items-center gap-1">
          {isMobile && onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5 cursor-pointer" />
            </Button>
          )}
          {/* Reply, Reply All, Forward buttons can remain if space allows or also go into dropdown */}
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <Reply className="h-4 w-4" />
              Reply
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <ReplyAll className="h-4 w-4 cursor-pointer" />
              Reply All
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <Forward className="h-4 w-4" />
              Forward
            </Button>
          </motion.div>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-48 bg-slate-900 border-slate-700 text-slate-300"
              align="end"
            >
              {selectedEmail.isRead && (
                <DropdownMenuItem
                  onClick={() => handleMarkAsRead(false)}
                  disabled={isProcessing}
                  className="hover:bg-slate-800 cursor-pointer"
                >
                  <MailOpen className="mr-2 h-4 w-4" />
                  Mark as Unread
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setShowNoteInput(!showNoteInput)}
                className="hover:bg-slate-800 cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" />
                Note
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleToggleStar}
                disabled={isProcessing}
                className="hover:bg-slate-800 cursor-pointer"
              >
                <Star
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedEmail.isStarred && 'fill-blue-500 text-blue-500'
                  )}
                />
                Star
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleArchive}
                disabled={isProcessing}
                className="hover:bg-slate-800 cursor-pointer"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isProcessing}
                className="hover:bg-slate-800 text-red-400 hover:text-red-300 cursor-pointer"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Email content */}
      <ScrollArea className="flex-1 p-8">
        {/* Subject */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-3xl font-bold leading-tight tracking-tight mb-6">
            {selectedEmail.subject}
          </h1>
        </motion.div>

        {/* Email Header with Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-start gap-4 mb-6"
        >
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedEmail.from.name}`}
            />
            <AvatarFallback>
              {selectedEmail.from.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-base font-semibold">
                  {selectedEmail.from.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedEmail.from.email}
                </p>
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <span>To:</span>
                  <span>{selectedEmail.to.map((t) => t.email).join(', ')}</span>
                  {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                    <span className="text-primary cursor-pointer hover:underline">
                      , {selectedEmail.cc.length} more
                    </span>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground sm:shrink-0 mt-2 sm:mt-0">
                {new Date(selectedEmail.timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* AI/Task Integration Section */}
        {taskInfo.isTask && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 mb-8 rounded-xl bg-accent/50 border border-border"
          >
            <div className="flex-1 flex items-center gap-4">
              <div className="p-2 bg-yellow-500/20 text-yellow-600  rounded-lg">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">This email is a task</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="secondary"
                    className="bg-orange-500/20 text-orange-600"
                  >
                    {taskInfo.status === 'doing'
                      ? 'Doing'
                      : taskInfo.status === 'done'
                      ? 'Done'
                      : 'To Do'}
                  </Badge>
                  {taskInfo.deadline && (
                    <p className="text-xs text-muted-foreground">
                      Deadline:{' '}
                      {new Date(taskInfo.deadline).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <ChevronDown className="h-4 w-4 mr-1" />
                Change Status
              </Button>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-1" />
                Snooze
              </Button>
            </div>
          </motion.div>
        )}

        {/* Email Body */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="prose prose-sm md:prose-base max-w-none mb-10"
          dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
        />

        {/* Attachments */}
        {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-6 border-t border-border"
          >
            <h3 className="font-semibold mb-3">
              {selectedEmail.attachments.length} Attachment
              {selectedEmail.attachments.length > 1 ? 's' : ''}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selectedEmail.attachments.map((attachment) => (
                <motion.div
                  key={attachment.id}
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center justify-center h-10 w-10 bg-primary/10 rounded-md shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(attachment.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Note Input */}
        {showNoteInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-border"
          >
            <label htmlFor="note" className="text-sm font-medium mb-2 block">
              Add a note to this email:
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring bg-background text-foreground"
              rows={3}
              placeholder="Enter your note here..."
            />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={isProcessing || !note.trim()}
              >
                Save Note
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowNoteInput(false);
                  setNote('');
                }}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {/* Existing Note */}
        {selectedEmail.note && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
          >
            <h3 className="text-sm font-medium mb-2">Note:</h3>
            <p className="text-sm">{selectedEmail.note}</p>
          </motion.div>
        )}
      </ScrollArea>
    </motion.div>
  );
};

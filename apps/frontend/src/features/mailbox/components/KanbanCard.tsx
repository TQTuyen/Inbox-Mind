import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import {
  Clock,
  Paperclip,
  Star,
  Mail,
  MailOpen,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Email } from '../store/emailStore';
import { cn } from '../../../lib/utils';

interface KanbanCardProps {
  email: Email;
  onClick: () => void;
  onSnooze: (emailId: string) => void;
  onGenerateSummary: (emailId: string) => void;
  isGeneratingSummary?: boolean;
  isDragOverlay?: boolean;
}

export function KanbanCard({
  email,
  onClick,
  onSnooze,
  onGenerateSummary,
  isGeneratingSummary,
  isDragOverlay = false,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: email.id });

  const style = isDragOverlay
    ? {}
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      };

  const formattedTime = formatDistanceToNow(new Date(email.timestamp), {
    addSuffix: true,
  });

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      className={cn(
        'group relative rounded-lg border bg-white dark:bg-slate-800 p-4 shadow-sm transition-all hover:shadow-md',
        !isDragOverlay && 'cursor-grab active:cursor-grabbing',
        isDragging && !isDragOverlay && 'opacity-50',
        isDragOverlay && 'shadow-2xl cursor-grabbing',
        !email.isRead && 'border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/20'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {email.isRead ? (
              <MailOpen className="h-4 w-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
            ) : (
              <Mail className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {email.from.name || email.from.email}
            </span>
          </div>
          <h3
            className={cn(
              'text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400',
              !email.isRead && 'font-semibold'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            {email.subject || '(No Subject)'}
          </h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {email.isStarred && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
      </div>

      {email.summary ? (
        <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded text-xs text-gray-700 dark:text-gray-300">
          <div className="flex items-start gap-1.5">
            <span className="text-purple-600 dark:text-purple-400 font-semibold flex-shrink-0">
              AI:
            </span>
            <p className="line-clamp-3">{email.summary}</p>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{email.preview}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateSummary(email.id);
            }}
            disabled={isGeneratingSummary}
            className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-xs font-medium disabled:opacity-50"
            title="Generate AI Summary"
          >
            {isGeneratingSummary ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" />
                <span>Summarize with AI</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <span>{formattedTime}</span>
          {email.attachments && email.attachments.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              <span>{email.attachments.length}</span>
            </div>
          )}
        </div>
        {email.kanbanStatus !== 'snoozed' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSnooze(email.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
            title="Snooze"
          >
            <Clock className="h-3 w-3" />
            <span>Snooze</span>
          </button>
        )}
      </div>

      {email.snoozeUntil && (
        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
          <Clock className="h-3 w-3" />
          <span>Until {new Date(email.snoozeUntil).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

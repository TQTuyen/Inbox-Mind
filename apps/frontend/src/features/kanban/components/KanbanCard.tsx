import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@fe/lib/utils';
import { Badge } from '@fe/shared/components/ui/badge';
import { Card } from '@fe/shared/components/ui/card';
import { format } from 'date-fns';
import {
  Clock,
  ExternalLink,
  GripVertical,
  Loader2,
  Mail,
  Paperclip,
  Sparkles,
  Star,
} from 'lucide-react';
import { Email } from '../../mailbox/store/emailStore';

interface KanbanCardProps {
  email: Email;
  onEmailClick: (email: Email) => void;
  onGenerateSummary?: (emailId: string) => void;
  isGeneratingSummary?: boolean;
  onSnooze?: (emailId: string) => void;
  onToggleStar?: (emailId: string, isStarred: boolean) => void;
}

export function KanbanCard({
  email,
  onEmailClick,
  onGenerateSummary,
  isGeneratingSummary,
  onSnooze,
  onToggleStar,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: email.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, maxWidth: '100%', overflow: 'hidden' }}
      {...attributes}
      className="w-full"
    >
      <Card
        className={cn(
          'group kanban-card p-3 mb-2 cursor-pointer hover:shadow-md transition-all bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700',
          isDragging && 'opacity-50',
          !email.isRead &&
            'bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-l-blue-500'
        )}
        style={{ maxWidth: '100%', overflow: 'hidden' }}
        onClick={() => onEmailClick(email)}
      >
        <div
          className="flex items-start gap-2"
          style={{ maxWidth: '100%', overflow: 'hidden' }}
        >
          {/* Drag Handle */}
          <button
            className="cursor-grab active:cursor-grabbing mt-1 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 flex-shrink-0"
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Email Content */}
          <div className="flex-1 min-w-0" style={{ overflow: 'hidden' }}>
            {/* Header: Sender and Time */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={cn(
                    'text-sm font-medium text-gray-900 dark:text-gray-100 truncate',
                    !email.isRead && 'font-semibold'
                  )}
                  style={{
                    display: 'block',
                    maxWidth: '180px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {email.from.name || email.from.email}
                </span>
                {!email.isRead && (
                  <Mail className="h-3 w-3 text-blue-600 flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                {format(new Date(email.timestamp), 'MMM dd')}
              </span>
            </div>

            {/* Subject */}
            <p
              className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100"
              style={{
                display: 'block',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {email.subject || '(No Subject)'}
            </p>

            {/* AI Summary or Preview */}
            {email.summary ? (
              <div
                className="mb-2 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded text-xs text-gray-700 dark:text-gray-300"
                style={{ overflow: 'hidden' }}
              >
                <div className="flex items-start gap-1.5">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold flex-shrink-0">
                    AI:
                  </span>
                  <p
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                  >
                    {email.summary}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-2" style={{ overflow: 'hidden' }}>
                <p
                  className="text-xs text-gray-600 dark:text-gray-400"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                  }}
                >
                  {email.preview}
                </p>
                {onGenerateSummary && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateSummary(email.id);
                    }}
                    disabled={isGeneratingSummary}
                    className="mt-2 flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-xs font-medium disabled:opacity-50"
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
                )}
              </div>
            )}

            {/* Footer: Badges and Actions */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Star button */}
                {onToggleStar && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onToggleStar(email.id, !email.isStarred);
                    }}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors relative z-10"
                    title={email.isStarred ? 'Unstar email' : 'Star email'}
                  >
                    <Star
                      className={cn(
                        'h-3 w-3 transition-colors',
                        email.isStarred
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400 hover:text-yellow-400'
                      )}
                    />
                  </button>
                )}
                {email.attachments && email.attachments.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    <Paperclip className="h-3 w-3 mr-1" />
                    {email.attachments.length}
                  </Badge>
                )}
                {/* Gmail link */}
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-0.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors relative z-10"
                  title="Open in Gmail"
                >
                  <ExternalLink className="h-3 w-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                </a>
              </div>

              {/* Snooze Button - Always visible on mobile, hover on desktop */}
              {onSnooze && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onSnooze(email.id);
                  }}
                  className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 text-xs px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 relative z-10"
                  title="Snooze email"
                >
                  <Clock className="h-3 w-3" />
                  <span className="hidden sm:inline">Snooze</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

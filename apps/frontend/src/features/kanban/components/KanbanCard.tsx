import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@fe/lib/utils';
import { Badge } from '@fe/shared/components/ui/badge';
import { Card } from '@fe/shared/components/ui/card';
import { format } from 'date-fns';
import { GripVertical, Mail, Paperclip, Star } from 'lucide-react';
import { Email } from '../../mailbox/store/emailStore';

interface KanbanCardProps {
  email: Email;
  onEmailClick: (email: Email) => void;
}

export function KanbanCard({ email, onEmailClick }: KanbanCardProps) {
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
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={cn(
          'p-3 mb-2 cursor-pointer hover:shadow-md transition-all',
          isDragging && 'opacity-50',
          !email.isRead && 'bg-blue-50/50 dark:bg-blue-950/20'
        )}
        onClick={() => onEmailClick(email)}
      >
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <button
            className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Email Content */}
          <div className="flex-1 min-w-0">
            {/* Header: Sender and Time */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={cn(
                    'text-sm font-medium truncate',
                    !email.isRead && 'font-semibold'
                  )}
                >
                  {email.from.name || email.from.email}
                </span>
                {!email.isRead && (
                  <Mail className="h-3 w-3 text-blue-600 flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(email.timestamp), 'MMM dd')}
              </span>
            </div>

            {/* Subject */}
            <div className="text-sm font-medium mb-1 line-clamp-1">
              {email.subject || '(No Subject)'}
            </div>

            {/* Preview */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {email.preview}
            </p>

            {/* Footer: Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {email.isStarred && (
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              )}
              {email.attachments && email.attachments.length > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {email.attachments.length}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

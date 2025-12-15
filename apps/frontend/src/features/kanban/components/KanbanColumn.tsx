import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@fe/lib/utils';
import { Badge } from '@fe/shared/components/ui/badge';
import { ScrollArea } from '@fe/shared/components/ui/scroll-area';
import { Email } from '../../mailbox/store/emailStore';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
  id: string;
  title: string;
  emails: Email[];
  onEmailClick: (email: Email) => void;
}

export function KanbanColumn({
  id,
  title,
  emails,
  onEmailClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div className="flex flex-col h-full bg-muted/20 rounded-lg border">
      {/* Column Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Badge variant="secondary" className="ml-2">
            {emails.length}
          </Badge>
        </div>
      </div>

      {/* Droppable Area */}
      <ScrollArea className="flex-1">
        <div
          ref={setNodeRef}
          className={cn(
            'p-3 min-h-[200px] transition-colors',
            isOver && 'bg-primary/5 ring-2 ring-primary/20 ring-inset'
          )}
        >
          <SortableContext
            items={emails.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            {emails.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                No emails
              </div>
            ) : (
              emails.map((email) => (
                <KanbanCard
                  key={email.id}
                  email={email}
                  onEmailClick={onEmailClick}
                />
              ))
            )}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
}

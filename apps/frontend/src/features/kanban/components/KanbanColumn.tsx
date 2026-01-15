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
    <div className="kanban-column flex flex-col h-full w-full bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0">
            {title}
          </h3>
          <Badge variant="secondary" className="flex-shrink-0">
            {emails.length}
          </Badge>
        </div>
      </div>

      {/* Droppable Area */}
      <ScrollArea className="flex-1 rounded-b-lg w-full overflow-x-hidden [&_[data-radix-scroll-area-viewport]]:!overflow-x-hidden">
        <div
          ref={setNodeRef}
          className={cn(
            'p-3 min-h-[200px] transition-colors w-full',
            isOver &&
              'bg-blue-50 dark:bg-blue-950/20 ring-2 ring-blue-500/20 ring-inset'
          )}
        >
          <SortableContext
            items={emails.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            {emails.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400 dark:text-slate-500">
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

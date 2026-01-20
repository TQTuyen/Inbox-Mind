import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@fe/lib/utils';
import { Badge } from '@fe/shared/components/ui/badge';
import { Email } from '../../mailbox/store/emailStore';
import { KanbanCard } from './KanbanCard';
import { useCallback } from 'react';

interface KanbanColumnProps {
  id: string;
  title: string;
  emails: Email[];
  onEmailClick: (email: Email) => void;
  onGenerateSummary?: (emailId: string) => void;
  generatingSummaryId?: string | null;
  onSnooze?: (emailId: string) => void;
}

export function KanbanColumn({
  id,
  title,
  emails,
  onEmailClick,
  onGenerateSummary,
  generatingSummaryId,
  onSnooze,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });
    const handleGenerateSummary = useCallback(
    (emailId: string) => {
      onGenerateSummary?.(emailId);
    },
    [onGenerateSummary]
  );

  const handleSnooze = useCallback(
    (emailId: string) => {
      onSnooze?.(emailId);
    },
    [onSnooze]
  );

  return (
    <div className="kanban-column flex flex-col h-full w-full max-w-full bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Column Header */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 w-full max-w-full overflow-hidden">
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
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden p-3 min-h-[200px] transition-colors',
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
                onGenerateSummary={handleGenerateSummary}
                isGeneratingSummary={generatingSummaryId === email.id}
                onSnooze={handleSnooze}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  defaultDropAnimationSideEffects,
  type DropAnimation,
  Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Email, KanbanStatus, useEmailStore } from '../store/emailStore';
import { KanbanCard } from './KanbanCard';
import { SnoozeModal } from '@fe/shared/components/SnoozeModal';
import { Inbox, ListTodo, PlayCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../../lib/utils';

// Modifier to snap the top-left of the original element to the cursor
const snapToCursor: Modifier = ({
  transform,
  activatorEvent,
  draggingNodeRect,
}) => {
  if (
    draggingNodeRect &&
    activatorEvent &&
    'clientX' in activatorEvent &&
    'clientY' in activatorEvent
  ) {
    const event = activatorEvent as PointerEvent;
    const offsetX = event.clientX - draggingNodeRect.left;
    const offsetY = event.clientY - draggingNodeRect.top;

    return {
      ...transform,
      x: transform.x + offsetX,
      y: transform.y + offsetY,
    };
  }

  return transform;
};

function DroppableColumn({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'inbox',
    title: 'Inbox',
    icon: <Inbox className="h-5 w-5" />,
    color:
      'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600',
  },
  {
    id: 'todo',
    title: 'To Do',
    icon: <ListTodo className="h-5 w-5" />,
    color:
      'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    icon: <PlayCircle className="h-5 w-5" />,
    color:
      'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
  },
  {
    id: 'done',
    title: 'Done',
    icon: <CheckCircle2 className="h-5 w-5" />,
    color:
      'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  },
  {
    id: 'snoozed',
    title: 'Snoozed',
    icon: <Clock className="h-5 w-5" />,
    color:
      'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700',
  },
];

interface KanbanBoardProps {
  onEmailClick: (email: Email) => void;
  onEmailStatusChange: (emailId: string, newStatus: KanbanStatus) => void;
  onEmailSnooze: (emailId: string, snoozeUntil: Date) => void;
  onGenerateSummary: (emailId: string) => void;
  activeFilter?: string;
}

export function KanbanBoard({
  onEmailClick,
  onEmailStatusChange,
  onEmailSnooze,
  onGenerateSummary,
  activeFilter = 'all',
}: KanbanBoardProps) {
  const { emails } = useEmailStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [generatingSummaryFor, setGeneratingSummaryFor] = useState<
    string | null
  >(null);
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);
  const [emailToSnooze, setEmailToSnooze] = useState<Email | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const groupedEmails = useMemo(() => {
    const groups: Record<KanbanStatus, Email[]> = {
      inbox: [],
      todo: [],
      in_progress: [],
      done: [],
      snoozed: [],
    };

    // Apply filter before grouping
    const filteredEmails = emails.filter((email) => {
      switch (activeFilter) {
        case 'unread':
          return !email.isRead;
        case 'important':
          return email.isStarred;
        case 'attachments':
          return email.attachments && email.attachments.length > 0;
        case 'vip':
          // TODO: Implement VIP logic based on contacts
          return false;
        case 'all':
        default:
          return true;
      }
    });

    filteredEmails.forEach((email) => {
      const status = email.kanbanStatus || 'inbox';
      groups[status].push(email);
    });

    return groups;
  }, [emails, activeFilter]);

  const activeEmail = activeId
    ? emails.find((email) => email.id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) return;

    const overId = over.id as string;

    // Check if dropped over a column
    const isOverColumn = KANBAN_COLUMNS.some((col) => col.id === overId);
    if (isOverColumn) {
      // Dropped directly on column
      return;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const emailId = active.id as string;
    let newStatus: KanbanStatus | null = null;

    // Check if dropped over a column
    const isOverColumn = KANBAN_COLUMNS.find((col) => col.id === over.id);
    if (isOverColumn) {
      newStatus = isOverColumn.id;
    } else {
      // Dropped over another email, find which column it belongs to
      const overEmail = emails.find((e) => e.id === over.id);
      if (overEmail) {
        newStatus = overEmail.kanbanStatus || 'inbox';
      }
    }

    if (newStatus) {
      const email = emails.find((e) => e.id === emailId);
      const currentStatus = email?.kanbanStatus || 'inbox';

      if (currentStatus !== newStatus) {
        onEmailStatusChange(emailId, newStatus);
      }
    }

    setActiveId(null);
  };

  const handleSnoozeClick = (emailId: string) => {
    const email = emails.find((e) => e.id === emailId);
    if (email) {
      setEmailToSnooze(email);
      setSnoozeModalOpen(true);
    }
  };

  const handleSnoozeConfirm = (snoozeUntil: Date) => {
    if (emailToSnooze) {
      onEmailSnooze(emailToSnooze.id, snoozeUntil);
      setSnoozeModalOpen(false);
      setEmailToSnooze(null);
    }
  };

  const handleGenerateSummary = async (emailId: string) => {
    setGeneratingSummaryFor(emailId);
    try {
      await onGenerateSummary(emailId);
    } finally {
      setGeneratingSummaryFor(null);
    }
  };

  const dropAnimation: DropAnimation = {
    duration: 200,
    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      modifiers={[snapToCursor]}
    >
      <div className="h-full overflow-x-auto">
        <div className="flex gap-4 p-4 min-w-max h-full">
          {KANBAN_COLUMNS.map((column) => (
            <div key={column.id} className="flex flex-col w-80 flex-shrink-0">
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-t-lg border-2 border-b-0',
                  column.color
                )}
              >
                {column.icon}
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                  {column.title}
                </h2>
                <span className="ml-auto bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                  {groupedEmails[column.id].length}
                </span>
              </div>
              <DroppableColumn
                id={column.id}
                className={cn(
                  'flex-1 border-2 border-t-0 rounded-b-lg bg-gray-50 dark:bg-slate-900/50 min-h-[400px] overflow-y-auto',
                  column.color
                )}
              >
                <SortableContext
                  items={groupedEmails[column.id].map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3 p-3">
                    {groupedEmails[column.id].map((email) => (
                      <KanbanCard
                        key={email.id}
                        email={email}
                        onClick={() => onEmailClick(email)}
                        onSnooze={handleSnoozeClick}
                        onGenerateSummary={handleGenerateSummary}
                        isGeneratingSummary={generatingSummaryFor === email.id}
                      />
                    ))}
                    {groupedEmails[column.id].length === 0 && (
                      <div className="flex items-center justify-center h-32 text-gray-400 dark:text-slate-500 text-sm">
                        Drop emails here
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DroppableColumn>
            </div>
          ))}
        </div>
      </div>

      <DragOverlay
        dropAnimation={dropAnimation}
        style={{
          cursor: 'grabbing',
        }}
      >
        {activeEmail ? (
          <div className="w-80 opacity-90 pointer-events-none">
            <KanbanCard
              email={activeEmail}
              onClick={() => {
                // DragOverlay card is not interactive
              }}
              onSnooze={() => {
                // DragOverlay card is not interactive
              }}
              onGenerateSummary={() => {
                // DragOverlay card is not interactive
              }}
              isDragOverlay={true}
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* Snooze Modal */}
      <SnoozeModal
        isOpen={snoozeModalOpen}
        onClose={() => {
          setSnoozeModalOpen(false);
          setEmailToSnooze(null);
        }}
        onSnooze={handleSnoozeConfirm}
        emailSubject={emailToSnooze?.subject}
      />
    </DndContext>
  );
}

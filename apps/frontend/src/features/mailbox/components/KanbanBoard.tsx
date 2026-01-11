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
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Email, KanbanStatus, useEmailStore } from '../store/emailStore';
import { KanbanCard } from './KanbanCard';
import { Inbox, ListTodo, PlayCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../../lib/utils';

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
}

export function KanbanBoard({
  onEmailClick,
  onEmailStatusChange,
  onEmailSnooze,
  onGenerateSummary,
}: KanbanBoardProps) {
  const { emails } = useEmailStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [generatingSummaryFor, setGeneratingSummaryFor] = useState<
    string | null
  >(null);

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

    emails.forEach((email) => {
      const status = email.kanbanStatus || 'inbox';
      groups[status].push(email);
    });

    return groups;
  }, [emails]);

  const activeEmail = activeId
    ? emails.find((email) => email.id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);

    // Calculate offset between cursor and drag handle position
    if (event.active.rect.current.initial) {
      const rect = event.active.rect.current.initial;

      // Type guard to ensure activatorEvent is a PointerEvent
      const isPointerEvent = (event: Event | null): event is PointerEvent => {
        return event !== null && 'clientX' in event && 'clientY' in event;
      };

      const offsetX = isPointerEvent(event.activatorEvent)
        ? event.activatorEvent.clientX - rect.left
        : 0;
      const offsetY = isPointerEvent(event.activatorEvent)
        ? event.activatorEvent.clientY - rect.top
        : 0;
      setDragOffset({ x: offsetX, y: offsetY });
    }
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

  const handleSnooze = (emailId: string) => {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + 2);
    onEmailSnooze(emailId, snoozeUntil);
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
                        onSnooze={handleSnooze}
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
          <div
            className="w-80 opacity-90 pointer-events-none"
            style={{
              transform: `translate(-${dragOffset.x}px, -${dragOffset.y}px)`,
            }}
          >
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
    </DndContext>
  );
}

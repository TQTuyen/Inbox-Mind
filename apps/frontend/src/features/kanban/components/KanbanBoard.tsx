import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Button } from '@fe/shared/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Email } from '../../mailbox/store/emailStore';
import { useKanbanStore } from '../store/kanbanStore';
import { FilterControls } from './FilterControls';
import { KanbanCard } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';
import { KanbanSettings } from './KanbanSettings';
import { SortControls } from './SortControls';

interface KanbanBoardProps {
  onEmailClick: (email: Email) => void;
}

export function KanbanBoard({ onEmailClick }: KanbanBoardProps) {
  // Use selectors to prevent unnecessary re-renders
  const columns = useKanbanStore((state) => state.columns);
  const moveEmail = useKanbanStore((state) => state.moveEmail);
  const [activeEmail, setActiveEmail] = useState<Email | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const navigate = useNavigate();

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    // Find the email being dragged
    const email = columns
      .flatMap((col) => col.emails)
      .find((e) => e.id === active.id);
    setActiveEmail(email || null);

    // Calculate offset between cursor and card top-left corner
    if (active.rect.current.initial) {
      const rect = active.rect.current.initial;

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveEmail(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source column
    const sourceColumn = columns.find((col) =>
      col.emails.some((e) => e.id === activeId)
    );

    // Check if overId is a column or an email
    const targetColumn =
      columns.find((col) => col.id === overId) ||
      columns.find((col) => col.emails.some((e) => e.id === overId));

    if (sourceColumn && targetColumn && sourceColumn.id !== targetColumn.id) {
      moveEmail(activeId, sourceColumn.id, targetColumn.id);
    }

    setActiveEmail(null);
  };

  const handleDragCancel = () => {
    setActiveEmail(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900/30">
      {/* Controls Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex items-center gap-4 flex-wrap">
        <Button
          variant="outline"
          onClick={() => navigate('/inbox/INBOX')}
          className="bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inbox
        </Button>
        <SortControls />
        <FilterControls />
        <div className="ml-auto">
          <KanbanSettings />
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 dark:from-slate-900 dark:via-blue-950/10 dark:to-slate-900">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 p-4 h-full">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex-1 min-w-[260px] overflow-hidden"
              >
                <KanbanColumn
                  id={column.id}
                  title={column.title}
                  emails={column.emails}
                  onEmailClick={onEmailClick}
                />
              </div>
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay
            dropAnimation={null}
            style={{
              cursor: 'grabbing',
            }}
          >
            {activeEmail ? (
              <div
                className="w-[280px] opacity-90"
                style={{
                  transform: `translate(-${dragOffset.x}px, -${dragOffset.y}px)`,
                }}
              >
                <KanbanCard
                  email={activeEmail}
                  onEmailClick={() => {
                    // No-op: click handler disabled during drag
                  }}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

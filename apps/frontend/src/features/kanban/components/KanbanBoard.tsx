import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useState } from 'react';
import { Email } from '../../mailbox/store/emailStore';
import { useKanbanStore } from '../store/kanbanStore';
import { FilterControls } from './FilterControls';
import { KanbanCard } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';
import { SortControls } from './SortControls';

interface KanbanBoardProps {
  onEmailClick: (email: Email) => void;
}

export function KanbanBoard({ onEmailClick }: KanbanBoardProps) {
  const { columns, moveEmail } = useKanbanStore();
  const [activeEmail, setActiveEmail] = useState<Email | null>(null);

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
    <div className="flex flex-col h-full">
      {/* Controls Bar */}
      <div className="p-4 border-b bg-background flex items-center gap-4 flex-wrap">
        <SortControls />
        <FilterControls />
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-4 p-4 h-full min-w-max">
            {columns.map((column) => (
              <div key={column.id} className="w-80 flex-shrink-0">
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
          <DragOverlay>
            {activeEmail ? (
              <div className="w-80 opacity-90">
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

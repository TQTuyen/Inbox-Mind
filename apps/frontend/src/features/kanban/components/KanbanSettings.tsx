import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  useCreateKanbanColumn,
  useDeleteKanbanColumn,
  useKanbanConfig,
  useReorderKanbanColumns,
  useUpdateKanbanColumn,
} from '@fe/hooks/useKanbanConfig';
import type { KanbanColumn } from '@fe/services/api/gmailApi';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@fe/shared/components/ui/alert-dialog';
import { Button } from '@fe/shared/components/ui/button';
import { Input } from '@fe/shared/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@fe/shared/components/ui/sheet';
import { useToast } from '@fe/shared/components/ui/use-toast';
import {
  Check,
  GripVertical,
  Loader2,
  Plus,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface SortableColumnItemProps {
  column: KanbanColumn;
  onDelete: (columnId: string) => void;
  onUpdate: (columnId: string, title: string) => void;
}

function SortableColumnItem({
  column,
  onDelete,
  onUpdate,
}: SortableColumnItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(column.title);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.columnId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = () => {
    if (editedTitle.trim() && editedTitle !== column.title) {
      onUpdate(column.columnId, editedTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTitle(column.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const isInbox = column.columnId === 'INBOX';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-background border rounded-lg hover:bg-accent/50 transition-colors"
    >
      {/* Drag Handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Column Title */}
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="h-8"
            autoFocus
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleSave}
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleCancel}
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="flex-1 text-left font-medium hover:text-primary"
          onClick={() => !isInbox && setIsEditing(true)}
          disabled={isInbox}
        >
          {column.title}
        </button>
      )}

      {/* Delete Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => onDelete(column.columnId)}
        disabled={isInbox}
        title={isInbox ? 'Cannot delete Inbox column' : 'Delete column'}
      >
        <Trash2
          className={`h-4 w-4 ${
            isInbox ? 'text-muted-foreground/50' : 'text-red-600'
          }`}
        />
      </Button>
    </div>
  );
}

export function KanbanSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

  const { data: columns = [], isLoading } = useKanbanConfig();
  const createColumnMutation = useCreateKanbanColumn();
  const updateColumnMutation = useUpdateKanbanColumn();
  const deleteColumnMutation = useDeleteKanbanColumn();
  const reorderColumnsMutation = useReorderKanbanColumns();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.columnId === active.id);
      const newIndex = columns.findIndex((col) => col.columnId === over.id);

      const reorderedColumns = arrayMove(columns, oldIndex, newIndex);
      const columnIds = reorderedColumns.map((col) => col.columnId);

      reorderColumnsMutation.mutate(columnIds, {
        onError: (error) => {
          toast({
            title: 'Failed to reorder columns',
            description: error.message,
            variant: 'destructive',
          });
        },
      });
    }
  };

  const handleCreateColumn = () => {
    const trimmedTitle = newColumnTitle.trim();

    if (!trimmedTitle) {
      toast({
        title: 'Invalid column name',
        description: 'Column name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    createColumnMutation.mutate(
      { title: trimmedTitle },
      {
        onSuccess: () => {
          setNewColumnTitle('');
          toast({
            title: 'Column created',
            description: `"${trimmedTitle}" has been added to your Kanban board`,
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to create column',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleUpdateColumn = (columnId: string, title: string) => {
    updateColumnMutation.mutate(
      { columnId, request: { title } },
      {
        onSuccess: () => {
          toast({
            title: 'Column updated',
            description: `Column renamed to "${title}"`,
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to update column',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleDeleteColumn = (columnId: string) => {
    setColumnToDelete(columnId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!columnToDelete) return;

    const column = columns.find((col) => col.columnId === columnToDelete);

    deleteColumnMutation.mutate(columnToDelete, {
      onSuccess: () => {
        toast({
          title: 'Column deleted',
          description: `"${column?.title}" has been removed from your Kanban board`,
        });
        setDeleteDialogOpen(false);
        setColumnToDelete(null);
      },
      onError: (error) => {
        toast({
          title: 'Failed to delete column',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreateColumn();
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Kanban Settings
          </Button>
        </SheetTrigger>

        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Kanban Board Settings</SheetTitle>
            <SheetDescription>
              Customize your Kanban columns. Drag to reorder, click to rename,
              or delete columns you don't need.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Create New Column Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Create New Column</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter column name..."
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={createColumnMutation.isPending}
                />
                <Button
                  onClick={handleCreateColumn}
                  disabled={
                    !newColumnTitle.trim() || createColumnMutation.isPending
                  }
                  size="sm"
                >
                  {createColumnMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Existing Columns Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Existing Columns</h3>

              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading columns...
                </div>
              ) : columns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No columns found. Create one to get started!
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={columns.map((col) => col.columnId)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {columns.map((column) => (
                        <SortableColumnItem
                          key={column.columnId}
                          column={column}
                          onDelete={handleDeleteColumn}
                          onUpdate={handleUpdateColumn}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Info Note */}
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-medium mb-1">Note:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>The Inbox column cannot be renamed or deleted</li>
                <li>Drag columns to change their order on the board</li>
                <li>Click a column name to rename it</li>
                <li>Moving emails between columns updates Gmail labels</li>
              </ul>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the column "
              {columns.find((col) => col.columnId === columnToDelete)?.title}".
              Emails in this column will not be deleted, but the column
              configuration will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setColumnToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteColumnMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

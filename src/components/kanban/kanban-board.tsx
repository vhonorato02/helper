'use client';

import { useOptimistic, useTransition, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { Inbox } from 'lucide-react';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { updateTicketStatus } from '@/actions/tickets';
import { BOARD_STATUSES, isBoardStatus } from '@/lib/constants';
import { copy } from '@/lib/copy';
import type { KanbanTicket } from '@/lib/kanban';

interface KanbanBoardProps {
  initialTickets: KanbanTicket[];
}

export function KanbanBoard({ initialTickets }: KanbanBoardProps) {
  const [, startTransition] = useTransition();
  const [activeTicket, setActiveTicket] = useState<KanbanTicket | null>(null);

  const [optimisticTickets, updateOptimistic] = useOptimistic(
    initialTickets,
    (state, { code, status }: { code: string; status: KanbanTicket['status'] }) =>
      state.map((t) => (t.code === code ? { ...t, status } : t)),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 12 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = optimisticTickets.find((t) => t.code === event.active.id);
    setActiveTicket(ticket ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTicket(null);
    const { active, over } = event;
    if (!over) return;

    const code = active.id as string;
    const overId = String(over.id);
    if (!isBoardStatus(overId)) return;

    const newStatus = overId;
    const ticket = optimisticTickets.find((t) => t.code === code);
    if (!ticket || ticket.status === newStatus) return;

    const previousStatus = ticket.status;

    startTransition(async () => {
      updateOptimistic({ code, status: newStatus });
      const result = await updateTicketStatus(code, newStatus);
      if (result && 'error' in result) {
        toast.error(result.error);
        // Snap back so UI matches the server state.
        updateOptimistic({ code, status: previousStatus });
        return;
      }
      // Undo action — restore the previous column for ~6s.
      toast.success(copy.kanban.moved(ticket.code, newStatus), {
        action: {
          label: copy.common.undo,
          onClick: () => {
            startTransition(async () => {
              updateOptimistic({ code, status: previousStatus });
              const undo = await updateTicketStatus(code, previousStatus);
              if (undo && 'error' in undo) toast.error(undo.error);
            });
          },
        },
        duration: 6000,
      });
    });
  };

  if (initialTickets.length === 0) {
    return (
      <div className="surface-panel rounded-lg px-5 py-20 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-muted/60">
          <Inbox className="size-5 text-muted-foreground" />
        </div>
        <p className="font-medium">{copy.kanban.emptyTitle}</p>
        <p className="text-sm text-muted-foreground mt-1.5">
          {copy.kanban.emptyHint}
        </p>
      </div>
    );
  }

  return (
    <DndContext
      id="helper-kanban"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="-mx-4 flex min-h-[calc(100vh-240px)] snap-x gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 xl:gap-2">
        {BOARD_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tickets={optimisticTickets.filter((t) => t.status === status)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTicket && (
          <div className="rotate-2 cursor-grabbing">
            <KanbanCard ticket={activeTicket} dragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

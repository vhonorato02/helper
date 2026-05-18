'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { KanbanCard } from './kanban-card';
import { STATUS_LABELS } from '@/lib/constants';
import { copy } from '@/lib/copy';
import type { Ticket } from '@/db/schema';

type Status = Ticket['status'];

interface KanbanColumnProps {
  status: Status;
  tickets: {
    id: string;
    code: string;
    area: Ticket['area'];
    title: string;
    subcategory: string;
    priority: Ticket['priority'];
    status: Status;
    updatedAt: Date;
    assigneeName?: string | null;
  }[];
}

const columnAccent: Record<Status, string> = {
  aberto: 'before:bg-zinc-400',
  em_andamento: 'before:bg-primary',
  aguardando: 'before:bg-amber-500',
  resolvido: 'before:bg-green-500',
  arquivado: 'before:bg-zinc-300',
};

const dotColor: Record<Status, string> = {
  aberto: 'bg-zinc-400',
  em_andamento: 'bg-primary',
  aguardando: 'bg-amber-500',
  resolvido: 'bg-green-500',
  arquivado: 'bg-zinc-300',
};

export function KanbanColumn({ status, tickets }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col sm:w-[300px]">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={cn('size-1.5 rounded-full', dotColor[status])} />
          <h3 className="text-sm font-semibold">{STATUS_LABELS[status]}</h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums bg-muted/60 rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">
          {tickets.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'relative flex min-h-[140px] flex-1 flex-col gap-2 rounded-lg border bg-muted/30 p-2 transition-colors',
          'before:absolute before:left-0 before:right-0 before:top-0 before:h-0.5 before:rounded-t-lg',
          columnAccent[status],
          isOver && 'bg-primary/5 border-primary/40 ring-2 ring-primary/30 ring-inset',
        )}
      >
        {tickets.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground/60 py-8 px-3 text-center">
            {isOver ? copy.common.dropHere : copy.common.empty}
          </div>
        ) : (
          tickets.map((t) => <KanbanCard key={t.code} ticket={t} />)
        )}
      </div>
    </div>
  );
}

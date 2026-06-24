'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { KanbanCard } from './kanban-card';
import { STATUS_LABELS } from '@/lib/constants';
import { copy } from '@/lib/copy';
import type { Ticket } from '@/db/schema';
import type { KanbanTicket } from '@/lib/kanban';

type Status = KanbanTicket['status'];

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
  onMoveStatus: (code: string, status: Status) => void;
}

const columnConfig: Record<
  Ticket['status'],
  { dot: string; stripe: string; badge: string; isOver: string }
> = {
  aberto: {
    dot: 'bg-zinc-400',
    stripe: 'bg-zinc-400/70',
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    isOver: 'bg-zinc-50 border-zinc-300 dark:bg-zinc-900 dark:border-zinc-600',
  },
  em_andamento: {
    dot: 'bg-primary',
    stripe: 'bg-primary/70',
    badge: 'bg-primary/10 text-primary',
    isOver: 'bg-primary/4 border-primary/40',
  },
  aguardando: {
    dot: 'bg-amber-500',
    stripe: 'bg-amber-400/70',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    isOver: 'bg-amber-50/60 border-amber-300 dark:bg-amber-950 dark:border-amber-700',
  },
  resolvido: {
    dot: 'bg-green-500',
    stripe: 'bg-green-400/70',
    badge: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
    isOver: 'bg-green-50/60 border-green-300 dark:bg-green-950 dark:border-green-700',
  },
  arquivado: {
    dot: 'bg-zinc-300 dark:bg-zinc-600',
    stripe: 'bg-zinc-300/70 dark:bg-zinc-600/70',
    badge: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
    isOver: 'bg-zinc-50 border-zinc-200 dark:bg-zinc-900',
  },
};

export function KanbanColumn({ status, tickets, onMoveStatus }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const config = columnConfig[status];

  return (
    <div className="flex w-[82vw] max-w-[300px] shrink-0 snap-start flex-col sm:w-[285px] xl:w-[250px] 2xl:w-[270px]">
      {/* Column header */}
      <div className="mb-2 flex items-center justify-between rounded-lg px-1 py-1.5">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', config.dot)} />
          <h3 className="text-sm font-semibold tracking-tight">{STATUS_LABELS[status]}</h3>
        </div>
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold min-w-[1.625rem] tabular-nums',
            config.badge,
          )}
        >
          {tickets.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'relative flex min-h-[200px] flex-1 flex-col gap-2 rounded-lg border-2 border-dashed p-2 transition-all duration-150',
          'border-border/50 bg-muted/20',
          isOver && ['border-solid', config.isOver, 'shadow-inner'],
        )}
      >
        {/* Color stripe at top */}
        <div
          className={cn(
            'absolute left-3 right-3 top-0 h-0.5 rounded-full opacity-60 transition-opacity',
            config.stripe,
            isOver && 'opacity-100',
          )}
        />

        {tickets.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-10 text-center">
            <p className="text-xs text-muted-foreground/50 font-medium">
              {isOver ? (
                <span className="text-muted-foreground">{copy.common.dropHere}</span>
              ) : (
                copy.common.empty
              )}
            </p>
          </div>
        ) : (
          tickets.map((t) => (
            <KanbanCard key={t.code} ticket={t} onMoveStatus={onMoveStatus} />
          ))
        )}
      </div>
    </div>
  );
}

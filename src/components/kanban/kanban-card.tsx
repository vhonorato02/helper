'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock3, UserRound } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PriorityBadge, AreaBadge } from '@/components/tickets/ticket-badge';
import { copy } from '@/lib/copy';
import { daysSince } from '@/lib/format';
import type { Ticket } from '@/db/schema';

interface KanbanCardProps {
  ticket: {
    id: string;
    code: string;
    area: Ticket['area'];
    title: string;
    subcategory: string;
    priority: Ticket['priority'];
    status: Ticket['status'];
    updatedAt: Date;
    assigneeName?: string | null;
  };
  dragging?: boolean;
}

export function KanbanCard({ ticket, dragging = false }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.code,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const updatedAgo = formatDistanceToNow(new Date(ticket.updatedAt), {
    addSuffix: true,
    locale: ptBR,
  });
  const staleDays = daysSince(ticket.updatedAt);
  const isStale = staleDays >= 3 && !['resolvido', 'arquivado'].includes(ticket.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group cursor-grab select-none rounded-lg border border-border/80 bg-card p-3 shadow-xs transition-all active:cursor-grabbing',
        'hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md',
        isDragging && 'opacity-30',
        dragging && 'shadow-xl ring-2 ring-primary border-primary',
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/tickets/${ticket.code}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {ticket.code}
        </Link>
        <PriorityBadge priority={ticket.priority} />
      </div>

      <p className="mb-2.5 line-clamp-2 text-sm font-semibold leading-snug">{ticket.title}</p>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 min-w-0">
          <AreaBadge area={ticket.area} />
          <span className="truncate">{ticket.subcategory}</span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1 min-w-0">
          <UserRound className="size-3 shrink-0" />
          <span
            className={cn('truncate', !ticket.assigneeName && 'text-muted-foreground/70')}
            title={ticket.assigneeName ?? copy.tickets.table.unassigned}
          >
            {ticket.assigneeName?.split(' ')[0] ?? copy.tickets.table.unassigned}
          </span>
        </span>
        <span
          className={cn(
            'flex items-center gap-1 shrink-0 tabular-nums max-w-[120px]',
            isStale && 'text-amber-600 dark:text-amber-400',
          )}
          title={isStale ? copy.kanban.staleFor(staleDays) : updatedAgo}
        >
          <Clock3 className="size-3 shrink-0" />
          <span className="truncate">
            {isStale ? copy.kanban.staleFor(staleDays) : updatedAgo}
          </span>
        </span>
      </div>
    </div>
  );
}

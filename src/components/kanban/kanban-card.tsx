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
        'group select-none rounded-xl border bg-card p-3 shadow-xs',
        'cursor-grab active:cursor-grabbing',
        'transition-all duration-100',
        'hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/15',
        isDragging && 'opacity-25 shadow-none',
        dragging && 'rotate-1 cursor-grabbing shadow-2xl ring-2 ring-primary/40 border-primary/40 scale-[1.02]',
      )}
      {...listeners}
      {...attributes}
    >
      {/* Header: code + priority */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <Link
          href={`/tickets/${ticket.code}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="font-mono text-[11px] font-semibold text-muted-foreground/80 hover:text-primary transition-colors"
        >
          {ticket.code}
        </Link>
        <PriorityBadge priority={ticket.priority} />
      </div>

      {/* Title */}
      <p className="mb-3 line-clamp-2 text-sm font-semibold leading-snug tracking-tight">
        {ticket.title}
      </p>

      {/* Area + subcategory */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5 min-w-0">
        <AreaBadge area={ticket.area} />
        <span className="truncate text-[11px]">{ticket.subcategory}</span>
      </div>

      {/* Footer: assignee + time */}
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
        <span className="flex items-center gap-1 min-w-0">
          <UserRound className="size-3 shrink-0 opacity-60" />
          <span
            className={cn('truncate', !ticket.assigneeName && 'opacity-60')}
            title={ticket.assigneeName ?? copy.tickets.table.unassigned}
          >
            {ticket.assigneeName?.split(' ')[0] ?? copy.tickets.table.unassigned}
          </span>
        </span>
        <span
          className={cn(
            'flex items-center gap-1 shrink-0 tabular-nums',
            isStale ? 'text-amber-600 dark:text-amber-400 font-medium' : 'opacity-70',
          )}
          title={isStale ? copy.kanban.staleFor(staleDays) : updatedAgo}
        >
          <Clock3 className="size-3 shrink-0" />
          <span className="max-w-[100px] truncate">
            {isStale ? copy.kanban.staleFor(staleDays) : updatedAgo}
          </span>
        </span>
      </div>
    </div>
  );
}

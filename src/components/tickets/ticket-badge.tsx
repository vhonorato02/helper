import { Badge } from '@/components/ui/badge';
import { PRIORITY_LABELS, STATUS_LABELS, AREA_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Ticket } from '@/db/schema';

type Priority = Ticket['priority'];
type Status = Ticket['status'];
type Area = Ticket['area'];

// Priority: red → urgent, orange → high, neutral → medium (default), outline → low.
// Yellow/green are reserved for status (waiting/resolved) to avoid double-meaning.
const priorityVariant: Record<Priority, 'destructive' | 'orange' | 'secondary' | 'outline'> = {
  urgente: 'destructive',
  alta: 'orange',
  media: 'secondary',
  baixa: 'outline',
};

const priorityDot: Record<Priority, string> = {
  urgente: 'bg-destructive',
  alta: 'bg-orange-500',
  media: 'bg-muted-foreground/60',
  baixa: 'bg-foreground/30',
};

const statusVariant: Record<Status, 'secondary' | 'default' | 'warning' | 'success' | 'outline'> = {
  aberto: 'secondary',
  em_andamento: 'default',
  aguardando: 'warning',
  resolvido: 'success',
  arquivado: 'outline',
};

const statusDot: Record<Status, string> = {
  aberto: 'bg-zinc-400',
  em_andamento: 'bg-primary',
  aguardando: 'bg-amber-500',
  resolvido: 'bg-green-500',
  arquivado: 'bg-zinc-300 dark:bg-zinc-600',
};

const areaVariant: Record<Area, 'secondary' | 'default' | 'outline'> = {
  TI: 'secondary',
  MKT: 'default',
  PF: 'outline',
};

export function PriorityBadge({
  priority,
  withDot = true,
}: {
  priority: Priority;
  withDot?: boolean;
}) {
  return (
    <Badge variant={priorityVariant[priority]} aria-label={`Prioridade ${PRIORITY_LABELS[priority]}`}>
      {withDot && <span className={cn('size-1.5 rounded-full', priorityDot[priority])} />}
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function StatusBadge({ status, withDot = true }: { status: Status; withDot?: boolean }) {
  return (
    <Badge variant={statusVariant[status]} aria-label={`Status ${STATUS_LABELS[status]}`}>
      {withDot && <span className={cn('size-1.5 rounded-full', statusDot[status])} />}
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function AreaBadge({ area }: { area: Area }) {
  return <Badge variant={areaVariant[area]} aria-label={`Área ${AREA_LABELS[area]}`}>{AREA_LABELS[area]}</Badge>;
}

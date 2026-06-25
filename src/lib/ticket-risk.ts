import type { Priority, Status } from '@/lib/constants';

type RiskTicket = {
  priority: Priority;
  status: Status;
  dueDate?: Date | string | null;
  updatedAt: Date | string;
  assigneeId?: string | null;
};

export type TicketRiskLevel = 'done' | 'normal' | 'attention' | 'critical';

export type TicketRisk = {
  level: TicketRiskLevel;
  label: string;
  reason: string;
  rank: number;
};

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function wholeDaysSince(value: Date, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - value.getTime()) / 86_400_000));
}

function wholeDaysUntil(value: Date, now: Date) {
  return Math.ceil((value.getTime() - now.getTime()) / 86_400_000);
}

export function getTicketRisk(ticket: RiskTicket, now = new Date()): TicketRisk {
  if (ticket.status === 'resolvido' || ticket.status === 'arquivado') {
    return { level: 'done', label: 'Concluída', reason: 'Fora da fila ativa', rank: 4 };
  }

  const dueDate = toDate(ticket.dueDate ?? null);
  if (dueDate && dueDate < now) {
    return { level: 'critical', label: 'Atrasada', reason: 'Prazo vencido', rank: 0 };
  }

  if (ticket.priority === 'urgente') {
    return { level: 'critical', label: 'Urgente', reason: 'Prioridade urgente', rank: 0 };
  }

  if (!ticket.assigneeId) {
    return { level: 'attention', label: 'Sem responsável', reason: 'Precisa de dono', rank: 1 };
  }

  if (ticket.status === 'aguardando') {
    return { level: 'attention', label: 'Aguardando', reason: 'Bloqueada ou pendente', rank: 1 };
  }

  if (dueDate) {
    const dueDays = wholeDaysUntil(dueDate, now);
    if (dueDays <= 1) {
      return {
        level: 'attention',
        label: dueDays <= 0 ? 'Vence hoje' : 'Vence amanhã',
        reason: 'Prazo próximo',
        rank: 1,
      };
    }
  }

  const updatedAt = toDate(ticket.updatedAt);
  const staleDays = updatedAt ? wholeDaysSince(updatedAt, now) : 0;
  if (staleDays >= 3) {
    return {
      level: 'attention',
      label: 'Parada',
      reason: `Sem movimento há ${staleDays} ${staleDays === 1 ? 'dia' : 'dias'}`,
      rank: 2,
    };
  }

  return { level: 'normal', label: 'Em ordem', reason: 'Sem alerta operacional', rank: 3 };
}

export function isRiskVisible(risk: TicketRisk) {
  return risk.level === 'critical' || risk.level === 'attention';
}

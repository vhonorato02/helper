import { isUserEnabledForArea } from '@/lib/assignment';
import type { Area } from '@/lib/constants';

export type AreaScopedUser = {
  id?: string | null;
  isAdmin?: boolean | null;
  role?: string | null;
  area?: Area | null;
  areas?: readonly Area[] | null;
};

export type PublicRequesterTicket = {
  area: Area;
  origin?: string | null;
  publicContact?: string | null;
  description?: string | null;
};

export type TicketAccessTarget = {
  area: Area;
  authorId?: string | null;
  assigneeId?: string | null;
};

const TICKET_AREAS = ['TI', 'MKT', 'PF'] as const satisfies readonly Area[];

export function canWorkOnTicketArea(user: AreaScopedUser | null | undefined, area: Area) {
  if (!user) return false;
  if (user.isAdmin === true) return true;

  return isUserEnabledForArea(
    {
      id: user.id ?? '',
      role: user.role ?? null,
      area: user.area ?? null,
      operationalAreas: user.areas ?? undefined,
      isActive: true,
    },
    area,
  );
}

export function canManageTicket(
  user: AreaScopedUser | null | undefined,
  ticket: TicketAccessTarget,
) {
  return canWorkOnTicketArea(user, ticket.area);
}

export function visibleTicketAreas(user: AreaScopedUser | null | undefined) {
  if (!user) return [];
  if (user.isAdmin === true) return [...TICKET_AREAS];
  return TICKET_AREAS.filter((area) => canWorkOnTicketArea(user, area));
}

export function canViewTicket(
  user: AreaScopedUser | null | undefined,
  ticket: TicketAccessTarget,
) {
  if (!user?.id) return false;
  if (canManageTicket(user, ticket)) return true;
  return ticket.authorId === user.id || ticket.assigneeId === user.id;
}

export function canCommentOnTicket(
  user: AreaScopedUser | null | undefined,
  ticket: TicketAccessTarget,
) {
  if (!user?.id) return false;
  return canViewTicket(user, ticket);
}

export function canViewPublicRequesterContact(
  user: AreaScopedUser | null | undefined,
  area: Area,
) {
  return canWorkOnTicketArea(user, area);
}

export function redactPublicRequesterContactLine(description: string | null | undefined) {
  if (!description) return null;

  const redacted = description
    .split(/\r?\n/)
    .filter((line) => !line.trim().toLocaleLowerCase('pt-BR').startsWith('contato:'))
    .join('\n')
    .trim();

  return redacted || null;
}

export function protectPublicRequesterData<T extends PublicRequesterTicket>(
  ticket: T,
  user: AreaScopedUser | null | undefined,
): T {
  if (ticket.origin !== 'Pagina publica') return ticket;
  if (canViewPublicRequesterContact(user, ticket.area)) return ticket;

  return {
    ...ticket,
    publicContact: null,
    description: redactPublicRequesterContactLine(ticket.description),
  };
}

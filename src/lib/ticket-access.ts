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

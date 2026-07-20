'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import { chromebookBookings, ticketHistory, tickets } from '@/db/schema';
import { confirmChromebookBooking } from '@/actions/chromebooks';
import { dispatchNotification } from '@/actions/notifications';
import { getDefaultAssigneeForArea, getEligibleAssigneeForArea } from '@/actions/users';
import { formatChromebookPeriod } from '@/lib/chromebooks';
import { canManageChromebookBookings } from '@/lib/chromebook-permissions';
import { AREA_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/constants';
import { copy } from '@/lib/copy';
import { canViewPublicRequesterContact, canWorkOnTicketArea } from '@/lib/ticket-access';
import { withTicketVisibility } from '@/lib/ticket-visibility';

const ACTIVE_TICKET_STATUSES = ['aberto', 'em_andamento', 'aguardando'] as const;
const ticketCodeSchema = z.string().trim().min(3).max(24);
const uuidSchema = z.string().uuid();

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return session.user;
}

async function recordHistory(
  ticketId: string,
  authorId: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
) {
  await db.insert(ticketHistory).values({ ticketId, authorId, field, oldValue, newValue });
}

function revalidateIntakeSurfaces(code?: string) {
  revalidatePath('/');
  revalidatePath('/solicitacoes-publicas');
  revalidatePath('/tickets');
  revalidatePath('/kanban');
  revalidatePath('/equipe');
  if (code) revalidatePath(`/tickets/${code}`);
}

export async function getExternalIntakeSummary(limit = 6) {
  const user = await requireAuth();
  const canManageChromebooks = canManageChromebookBookings(user);

  const [
    publicTicketCountRow,
    publicUnassignedCountRow,
    chromebookPendingCountRow,
    publicTickets,
    pendingChromebooks,
  ] = await Promise.all([
    db
      .select({ total: count() })
      .from(tickets)
      .where(
        withTicketVisibility(
          and(
            eq(tickets.origin, 'Pagina publica'),
            inArray(tickets.status, [...ACTIVE_TICKET_STATUSES]),
          ),
          user,
        ),
      ),
    db
      .select({ total: count() })
      .from(tickets)
      .where(
        withTicketVisibility(
          and(
            eq(tickets.origin, 'Pagina publica'),
            inArray(tickets.status, [...ACTIVE_TICKET_STATUSES]),
            isNull(tickets.assigneeId),
          ),
          user,
        ),
      ),
    db
      .select({ total: count() })
      .from(chromebookBookings)
      .where(eq(chromebookBookings.status, 'pendente')),
    db
      .select({
        id: tickets.id,
        code: tickets.code,
        area: tickets.area,
        title: tickets.title,
        priority: tickets.priority,
        status: tickets.status,
        location: tickets.location,
        publicContact: tickets.publicContact,
        assigneeId: tickets.assigneeId,
        createdAt: tickets.createdAt,
      })
      .from(tickets)
      .where(
        withTicketVisibility(
          and(
            eq(tickets.origin, 'Pagina publica'),
            inArray(tickets.status, [...ACTIVE_TICKET_STATUSES]),
          ),
          user,
        ),
      )
      .orderBy(asc(tickets.createdAt))
      .limit(limit),
    db
      .select({
        id: chromebookBookings.id,
        protocol: chromebookBookings.protocol,
        room: chromebookBookings.room,
        requesterName: chromebookBookings.requesterName,
        requesterContact: chromebookBookings.requesterContact,
        quantity: chromebookBookings.quantity,
        startAt: chromebookBookings.startAt,
        endAt: chromebookBookings.endAt,
        createdAt: chromebookBookings.createdAt,
      })
      .from(chromebookBookings)
      .where(eq(chromebookBookings.status, 'pendente'))
      .orderBy(asc(chromebookBookings.createdAt))
      .limit(limit),
  ]);

  const ticketItems = publicTickets.map((ticket) => ({
    id: ticket.id,
    kind: 'ticket' as const,
    code: ticket.code,
    title: ticket.title,
    detail: `${AREA_LABELS[ticket.area]} · ${STATUS_LABELS[ticket.status]} · ${PRIORITY_LABELS[ticket.priority]}`,
    area: ticket.area,
    status: ticket.status,
    assigneeId: ticket.assigneeId,
    location: ticket.location,
    contact: canViewPublicRequesterContact(user, ticket.area) ? ticket.publicContact : null,
    canManage: canWorkOnTicketArea(user, ticket.area),
    href: `/tickets/${ticket.code}`,
    createdAt: ticket.createdAt,
  }));

  const chromebookItems = pendingChromebooks.map((booking) => ({
    id: booking.id,
    kind: 'chromebook' as const,
    code: booking.protocol ?? 'Sem protocolo',
    title: `${booking.quantity} Chromebook(s) para ${booking.room}`,
    detail: formatChromebookPeriod(booking.startAt, booking.endAt),
    status: 'pendente' as const,
    location: booking.room,
    contact: canManageChromebooks ? booking.requesterContact : null,
    href: '/chromebooks?status=pendente',
    createdAt: booking.createdAt,
  }));

  const items = [...ticketItems, ...chromebookItems]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, limit);

  const publicTicketCount = Number(publicTicketCountRow[0]?.total ?? 0);
  const publicUnassignedCount = Number(publicUnassignedCountRow[0]?.total ?? 0);
  const chromebookPendingCount = Number(chromebookPendingCountRow[0]?.total ?? 0);

  return {
    publicTicketCount,
    publicUnassignedCount,
    chromebookPendingCount,
    totalActive: publicTicketCount + chromebookPendingCount,
    items,
  };
}

export async function assignPublicTicketToDefault(code: string) {
  const user = await requireAuth();
  const parsed = ticketCodeSchema.safeParse(code);
  if (!parsed.success) return { error: copy.validation.invalidTicket };

  const [ticket] = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      origin: tickets.origin,
      assigneeId: tickets.assigneeId,
    })
    .from(tickets)
    .where(eq(tickets.code, parsed.data))
    .limit(1);

  if (!ticket || ticket.origin !== 'Pagina publica') return { error: copy.validation.invalidTicket };
  if (!canWorkOnTicketArea(user, ticket.area)) return { error: copy.auth.errors.permissionDenied };

  const assignee = await getDefaultAssigneeForArea(ticket.area);
  if (!assignee) return { error: 'Nenhum responsável padrão encontrado para esta área.' };
  if (ticket.assigneeId === assignee.id) return { ok: true, assigneeName: assignee.displayName };

  await db
    .update(tickets)
    .set({ assigneeId: assignee.id, updatedAt: new Date() })
    .where(eq(tickets.id, ticket.id));

  await recordHistory(ticket.id, user.id, 'responsavel', null, assignee.displayName);
  await dispatchNotification({
    userIds: [assignee.id].filter((id) => id !== user.id),
    type: 'ticket_assigned',
    title: `Demanda pública atribuída: ${ticket.code}`,
    body: ticket.title,
    link: `/tickets/${ticket.code}`,
    ticketId: ticket.id,
  });

  revalidateIntakeSurfaces(ticket.code);
  return { ok: true, assigneeName: assignee.displayName };
}

export async function startPublicTicket(code: string) {
  const user = await requireAuth();
  const parsed = ticketCodeSchema.safeParse(code);
  if (!parsed.success) return { error: copy.validation.invalidTicket };

  const [ticket] = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      origin: tickets.origin,
      status: tickets.status,
      assigneeId: tickets.assigneeId,
      authorId: tickets.authorId,
    })
    .from(tickets)
    .where(eq(tickets.code, parsed.data))
    .limit(1);

  if (!ticket || ticket.origin !== 'Pagina publica') return { error: copy.validation.invalidTicket };
  if (!canWorkOnTicketArea(user, ticket.area)) return { error: copy.auth.errors.permissionDenied };

  const selfAssignee = ticket.assigneeId ? null : await getEligibleAssigneeForArea(user.id, ticket.area);
  if (!ticket.assigneeId && !selfAssignee) return { error: copy.validation.ineligibleAssignee };

  const nextAssigneeId = ticket.assigneeId ?? selfAssignee!.id;
  const nextStatus = ticket.status === 'em_andamento' ? ticket.status : 'em_andamento';
  const now = new Date();

  await db
    .update(tickets)
    .set({ assigneeId: nextAssigneeId, status: nextStatus, updatedAt: now })
    .where(eq(tickets.id, ticket.id));

  if (!ticket.assigneeId) {
    await recordHistory(ticket.id, user.id, 'responsavel', null, user.name ?? user.username ?? 'Equipe');
  }
  if (ticket.status !== nextStatus) {
    await recordHistory(ticket.id, user.id, 'status', ticket.status, nextStatus);
  }

  await dispatchNotification({
    userIds: [ticket.authorId, nextAssigneeId].filter(
      (id): id is string => Boolean(id && id !== user.id),
    ),
    type: 'ticket_status_updated',
    title: `Triagem iniciada: ${ticket.code}`,
    body: ticket.title,
    link: `/tickets/${ticket.code}`,
    ticketId: ticket.id,
  });

  revalidateIntakeSurfaces(ticket.code);
  return { ok: true };
}

export async function approvePublicChromebookBooking(id: string) {
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const result = await confirmChromebookBooking(parsed.data);
  revalidatePath('/');
  revalidatePath('/solicitacoes-publicas');
  revalidatePath('/chromebooks');
  return result;
}

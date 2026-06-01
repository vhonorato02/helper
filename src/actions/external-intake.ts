'use server';

import { redirect } from 'next/navigation';
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { chromebookBookings, tickets } from '@/db/schema';
import { formatChromebookPeriod } from '@/lib/chromebooks';
import { AREA_LABELS, PRIORITY_LABELS, STATUS_LABELS } from '@/lib/constants';

const ACTIVE_TICKET_STATUSES = ['aberto', 'em_andamento', 'aguardando'] as const;

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect('/login');
}

export async function getExternalIntakeSummary(limit = 6) {
  await requireAuth();

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
      .where(and(eq(tickets.origin, 'Pagina publica'), inArray(tickets.status, [...ACTIVE_TICKET_STATUSES]))),
    db
      .select({ total: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.origin, 'Pagina publica'),
          inArray(tickets.status, [...ACTIVE_TICKET_STATUSES]),
          isNull(tickets.assigneeId),
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
        createdAt: tickets.createdAt,
      })
      .from(tickets)
      .where(and(eq(tickets.origin, 'Pagina publica'), inArray(tickets.status, [...ACTIVE_TICKET_STATUSES])))
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
    location: ticket.location,
    contact: ticket.publicContact,
    href: `/tickets/${ticket.code}`,
    createdAt: ticket.createdAt,
  }));

  const chromebookItems = pendingChromebooks.map((booking) => ({
    id: booking.id,
    kind: 'chromebook' as const,
    code: booking.protocol ?? 'Sem protocolo',
    title: `${booking.quantity} Chromebook(s) para ${booking.room}`,
    detail: formatChromebookPeriod(booking.startAt, booking.endAt),
    location: booking.room,
    contact: booking.requesterContact,
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

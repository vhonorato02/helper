'use server';

import { redirect } from 'next/navigation';
import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import {
  chromebookBookings,
  notifications,
  recordings,
  schedules,
  tickets,
  users,
} from '@/db/schema';
import { getNotificationPreferences } from '@/actions/notifications';
import { formatChromebookPeriod } from '@/lib/chromebooks';
import { AREA_LABELS, PRIORITY_LABELS, STATUS_LABELS, type Area } from '@/lib/constants';

export type ReminderPulseItem = {
  id: string;
  kind: 'notification' | 'schedule' | 'ticket' | 'recording' | 'chromebook';
  title: string;
  body: string;
  href: string;
  dueAt: string;
  priority: 'overdue' | 'now' | 'soon';
  repeat: boolean;
  repeatMinutes: number;
};

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

function priorityFor(dueAt: Date, now: Date): ReminderPulseItem['priority'] {
  const minutes = Math.round((dueAt.getTime() - now.getTime()) / 60_000);
  if (minutes < 0) return 'overdue';
  if (minutes <= 10) return 'now';
  return 'soon';
}

function timeLabel(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(value);
}

function areaLabel(area: Area | null) {
  return area ? AREA_LABELS[area] : 'Geral';
}

async function loadOperationalReminders(user: Awaited<ReturnType<typeof requireAuth>>, limit = 20) {
  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const recentlyPast = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  const ticketScope = user.isAdmin
    ? undefined
    : or(eq(tickets.assigneeId, user.id), eq(tickets.authorId, user.id), isNull(tickets.assigneeId));

  const recordingScope = user.isAdmin
    ? undefined
    : or(eq(recordings.responsibleId, user.id), eq(recordings.authorId, user.id));

  const [scheduleRows, ticketRows, recordingRows, chromebookRows] = await Promise.all([
    db
      .select({
        id: schedules.id,
        title: schedules.title,
        description: schedules.description,
        scheduledDate: schedules.scheduledDate,
        area: schedules.area,
        reminderMinutesBefore: schedules.reminderMinutesBefore,
        repeatReminder: schedules.repeatReminder,
      })
      .from(schedules)
      .where(
        and(
          eq(schedules.status, 'pendente'),
          gte(schedules.scheduledDate, recentlyPast),
          lte(schedules.scheduledDate, horizon),
        ),
      )
      .orderBy(asc(schedules.scheduledDate))
      .limit(limit),
    db
      .select({
        id: tickets.id,
        code: tickets.code,
        title: tickets.title,
        area: tickets.area,
        priority: tickets.priority,
        status: tickets.status,
        dueDate: tickets.dueDate,
        assigneeName: users.displayName,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assigneeId, users.id))
      .where(
        and(
          sql`${tickets.dueDate} IS NOT NULL`,
          lte(tickets.dueDate, horizon),
          inArray(tickets.status, ['aberto', 'em_andamento', 'aguardando']),
          ticketScope,
        ),
      )
      .orderBy(asc(tickets.dueDate))
      .limit(limit),
    db
      .select({
        id: recordings.id,
        title: recordings.title,
        scheduledDate: recordings.scheduledDate,
        location: recordings.location,
        responsibleName: users.displayName,
      })
      .from(recordings)
      .leftJoin(users, eq(recordings.responsibleId, users.id))
      .where(
        and(
          gte(recordings.scheduledDate, recentlyPast),
          lte(recordings.scheduledDate, horizon),
          inArray(recordings.status, ['planejada', 'confirmada']),
          recordingScope,
        ),
      )
      .orderBy(asc(recordings.scheduledDate))
      .limit(limit),
    user.isAdmin
      ? db
          .select({
            id: chromebookBookings.id,
            protocol: chromebookBookings.protocol,
            room: chromebookBookings.room,
            requesterName: chromebookBookings.requesterName,
            quantity: chromebookBookings.quantity,
            startAt: chromebookBookings.startAt,
            endAt: chromebookBookings.endAt,
            status: chromebookBookings.status,
          })
          .from(chromebookBookings)
          .where(
            and(
              gte(chromebookBookings.startAt, recentlyPast),
              lte(chromebookBookings.startAt, horizon),
              inArray(chromebookBookings.status, ['pendente', 'confirmado']),
            ),
          )
          .orderBy(asc(chromebookBookings.startAt))
          .limit(limit)
      : Promise.resolve([]),
  ]);

  const items: ReminderPulseItem[] = [
    ...scheduleRows.map((item) => ({
      id: `schedule:${item.id}`,
      kind: 'schedule' as const,
      title: item.title,
      body: `${areaLabel(item.area)} · ${timeLabel(item.scheduledDate)}${item.description ? ` · ${item.description}` : ''}`,
      href: `/agendamentos#sched-${item.id}`,
      dueAt: item.scheduledDate.toISOString(),
      priority: priorityFor(item.scheduledDate, now),
      repeat: item.repeatReminder,
      repeatMinutes: 5,
    })),
    ...ticketRows.map((ticket) => ({
      id: `ticket:${ticket.id}`,
      kind: 'ticket' as const,
      title: `${ticket.code} · ${ticket.title}`,
      body: `${AREA_LABELS[ticket.area]} · ${PRIORITY_LABELS[ticket.priority]} · ${STATUS_LABELS[ticket.status]}${ticket.assigneeName ? ` · ${ticket.assigneeName}` : ''}`,
      href: `/tickets/${ticket.code}`,
      dueAt: ticket.dueDate!.toISOString(),
      priority: priorityFor(ticket.dueDate!, now),
      repeat: true,
      repeatMinutes: 30,
    })),
    ...recordingRows.map((recording) => ({
      id: `recording:${recording.id}`,
      kind: 'recording' as const,
      title: `Gravação: ${recording.title}`,
      body: `${timeLabel(recording.scheduledDate)}${recording.location ? ` · ${recording.location}` : ''}${recording.responsibleName ? ` · ${recording.responsibleName}` : ''}`,
      href: '/marketing/gravacoes',
      dueAt: recording.scheduledDate.toISOString(),
      priority: priorityFor(recording.scheduledDate, now),
      repeat: true,
      repeatMinutes: 10,
    })),
    ...chromebookRows.map((booking) => ({
      id: `chromebook:${booking.id}`,
      kind: 'chromebook' as const,
      title: booking.status === 'pendente' ? 'Reserva de Chromebook pendente' : 'Reserva de Chromebook',
      body: `${booking.protocol ?? booking.requesterName} · ${booking.room} · ${booking.quantity} un. · ${formatChromebookPeriod(booking.startAt, booking.endAt)}`,
      href: booking.status === 'pendente' ? '/chromebooks?status=pendente' : '/chromebooks',
      dueAt: booking.startAt.toISOString(),
      priority: priorityFor(booking.startAt, now),
      repeat: booking.status === 'pendente',
      repeatMinutes: 15,
    })),
  ];

  return items
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, limit);
}

export async function getOperationalReminders(limit = 16) {
  const user = await requireAuth();
  return loadOperationalReminders(user, limit);
}

export async function getBrowserNotificationPulse() {
  const user = await requireAuth();
  const preferences = await getNotificationPreferences();

  if (!preferences.browserEnabled) {
    return { browserEnabled: false, items: [] as ReminderPulseItem[] };
  }

  const now = new Date();
  const leadMs = Math.max(0, preferences.reminderLeadMinutes ?? 30) * 60_000;
  const unreadRows = await db
    .select({
      id: notifications.id,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)))
    .orderBy(asc(notifications.createdAt))
    .limit(6);

  const unreadItems = unreadRows.map((item) => ({
    id: `notification:${item.id}`,
    kind: 'notification' as const,
    title: item.title,
    body: item.body ?? 'Nova notificação no Helper.',
    href: item.link ?? '/notificacoes',
    dueAt: item.createdAt.toISOString(),
    priority: 'now' as const,
    repeat: false,
    repeatMinutes: 0,
  }));

  const reminderItems = (await loadOperationalReminders(user, 20)).filter((item) => {
    const dueAt = new Date(item.dueAt).getTime();
    return dueAt <= now.getTime() + leadMs;
  });

  return {
    browserEnabled: true,
    items: [...unreadItems, ...reminderItems].slice(0, 18),
  };
}

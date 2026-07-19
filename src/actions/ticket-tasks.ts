'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import { ticketHistory, ticketTasks, tickets, users } from '@/db/schema';
import { dispatchNotification } from '@/actions/notifications';
import { copy } from '@/lib/copy';
import { canManageTicket } from '@/lib/ticket-access';

const taskTitleSchema = z.string().trim().min(1).max(160);
const taskIdSchema = z.string().uuid();

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

async function getTaskTicket(code: string) {
  const [ticket] = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      authorId: tickets.authorId,
      assigneeId: tickets.assigneeId,
    })
    .from(tickets)
    .where(eq(tickets.code, code))
    .limit(1);
  return ticket ?? null;
}

async function recordTaskHistory(
  ticketId: string,
  authorId: string,
  field: 'task_added' | 'task_completed' | 'task_reopened' | 'task_deleted',
  title: string,
) {
  await db.insert(ticketHistory).values({
    ticketId,
    authorId,
    field,
    oldValue: null,
    newValue: title,
  });
}

export async function getTicketTasks(code: string) {
  await requireAuth();

  const ticket = await getTaskTicket(code);
  if (!ticket) return [];

  return db
    .select({
      id: ticketTasks.id,
      title: ticketTasks.title,
      isDone: ticketTasks.isDone,
      completedAt: ticketTasks.completedAt,
      createdAt: ticketTasks.createdAt,
      authorName: users.displayName,
    })
    .from(ticketTasks)
    .leftJoin(users, eq(ticketTasks.authorId, users.id))
    .where(eq(ticketTasks.ticketId, ticket.id))
    .orderBy(asc(ticketTasks.isDone), asc(ticketTasks.createdAt));
}

export type TicketTaskRow = Awaited<ReturnType<typeof getTicketTasks>>[number];

export async function createTicketTask(code: string, formData: FormData) {
  const user = await requireAuth();

  const parsed = taskTitleSchema.safeParse(formData.get('title'));
  if (!parsed.success) return { error: copy.validation.invalidData };

  const ticket = await getTaskTicket(code);
  if (!ticket) return { error: copy.validation.invalidTicket };
  if (!canManageTicket(user, ticket)) return { error: copy.auth.errors.permissionDenied };

  await db.insert(ticketTasks).values({
    ticketId: ticket.id,
    title: parsed.data,
    authorId: user.id,
  });

  await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, ticket.id));
  await recordTaskHistory(ticket.id, user.id, 'task_added', parsed.data);

  await dispatchNotification({
    userIds: [ticket.assigneeId, ticket.authorId].filter(
      (id): id is string => Boolean(id && id !== user.id),
    ),
    type: 'ticket_task_added',
    title: `Checklist atualizado: ${ticket.code}`,
    body: parsed.data,
    link: `/tickets/${ticket.code}`,
    ticketId: ticket.id,
  });

  revalidatePath('/');
  revalidatePath('/tickets');
  revalidatePath(`/tickets/${ticket.code}`);
  return { ok: true };
}

export async function toggleTicketTask(id: string, done: boolean) {
  const user = await requireAuth();

  const parsed = taskIdSchema.safeParse(id);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const [row] = await db
    .select({
      id: ticketTasks.id,
      title: ticketTasks.title,
      isDone: ticketTasks.isDone,
      ticketId: ticketTasks.ticketId,
      code: tickets.code,
      area: tickets.area,
      ticketTitle: tickets.title,
      authorId: tickets.authorId,
      assigneeId: tickets.assigneeId,
    })
    .from(ticketTasks)
    .innerJoin(tickets, eq(ticketTasks.ticketId, tickets.id))
    .where(eq(ticketTasks.id, parsed.data))
    .limit(1);

  if (!row) return { error: copy.validation.invalidData };
  if (!canManageTicket(user, row)) return { error: copy.auth.errors.permissionDenied };
  if (row.isDone === done) return { ok: true };

  const now = new Date();
  await db
    .update(ticketTasks)
    .set({ isDone: done, completedAt: done ? now : null, updatedAt: now })
    .where(eq(ticketTasks.id, parsed.data));
  await db.update(tickets).set({ updatedAt: now }).where(eq(tickets.id, row.ticketId));
  await recordTaskHistory(row.ticketId, user.id, done ? 'task_completed' : 'task_reopened', row.title);

  await dispatchNotification({
    userIds: [row.assigneeId, row.authorId].filter(
      (userId): userId is string => Boolean(userId && userId !== user.id),
    ),
    type: done ? 'ticket_task_completed' : 'ticket_task_reopened',
    title: `${done ? 'Tarefa concluída' : 'Tarefa reaberta'}: ${row.code}`,
    body: row.title,
    link: `/tickets/${row.code}`,
    ticketId: row.ticketId,
  });

  revalidatePath('/');
  revalidatePath('/tickets');
  revalidatePath(`/tickets/${row.code}`);
  return { ok: true };
}

export async function deleteTicketTask(id: string) {
  const user = await requireAuth();

  const parsed = taskIdSchema.safeParse(id);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const [row] = await db
    .select({
      id: ticketTasks.id,
      title: ticketTasks.title,
      ticketId: ticketTasks.ticketId,
      code: tickets.code,
      area: tickets.area,
      authorId: tickets.authorId,
      assigneeId: tickets.assigneeId,
    })
    .from(ticketTasks)
    .innerJoin(tickets, eq(ticketTasks.ticketId, tickets.id))
    .where(and(eq(ticketTasks.id, parsed.data)))
    .limit(1);

  if (!row) return { error: copy.validation.invalidData };
  if (!canManageTicket(user, row)) return { error: copy.auth.errors.permissionDenied };

  await db.delete(ticketTasks).where(eq(ticketTasks.id, parsed.data));
  await db.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, row.ticketId));
  await recordTaskHistory(row.ticketId, user.id, 'task_deleted', row.title);

  revalidatePath('/');
  revalidatePath('/tickets');
  revalidatePath(`/tickets/${row.code}`);
  return { ok: true };
}

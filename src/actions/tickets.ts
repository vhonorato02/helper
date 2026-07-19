'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { ticketHistory, tickets, users, type NewTicket } from '@/db/schema';
import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  like,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { copy } from '@/lib/copy';
import { STATUS_LABELS, type Area, type BoardStatus, type Priority, type Status } from '@/lib/constants';
import type { KanbanTicket } from '@/lib/kanban';
import { isValidSubcategoryAsync } from '@/actions/subcategories';
import { sendTicketNotification } from '@/lib/email';
import { nextResolvedAt } from '@/lib/ticket-status';
import { dispatchNotification } from '@/actions/notifications';
import { getDefaultAssigneeForArea, getEligibleAssigneeForArea } from '@/actions/users';
import { canManageTicket, protectPublicRequesterData } from '@/lib/ticket-access';

const areaSchema = z.enum(['TI', 'MKT', 'PF']);
const prioritySchema = z.enum(['baixa', 'media', 'alta', 'urgente']);
const statusSchema = z.enum(['aberto', 'em_andamento', 'aguardando', 'resolvido', 'arquivado']);
const sortSchema = z.enum(['created_desc', 'updated_desc', 'priority']);
const ticketAssignee = alias(users, 'ticket_assignee');
const ATTENTION_STALE_DAYS = 3;
const EXPORT_TICKET_LIMIT = 2000;

type TicketFilters = {
  area?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  origin?: string;
  search?: string;
  attention?: string;
  due?: string;
  sort?: string;
};

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  return session.user;
}

async function requireAdmin() {
  const user = await requireAuth();
  if (!user.isAdmin) return null;
  return user;
}

async function generateCode(area: Area): Promise<string> {
  const result = await db
    .select({ code: tickets.code })
    .from(tickets)
    .where(like(tickets.code, `${area}-%`))
    .orderBy(desc(tickets.code))
    .limit(1);

  if (result.length === 0) return `${area}-0001`;

  const last = result[0].code;
  const nextNumber = Number.parseInt(last.split('-')[1] ?? '0', 10) + 1;
  return `${area}-${nextNumber.toString().padStart(4, '0')}`;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    String(error.message).toLowerCase().includes('unique')
  );
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

async function resolveUserName(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const [user] = await db
    .select({ displayName: users.displayName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.displayName ?? copy.common.removedUser;
}

const ticketDetailsSchema = z.object({
  area: areaSchema,
  title: z.string().trim().min(1).max(80),
  subcategory: z.string().trim().min(1).max(80),
  priority: prioritySchema.default('media'),
  dueDate: z.string().optional(),
  description: z.string().trim().max(4000).optional(),
  origin: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
});

const createSchema = ticketDetailsSchema.extend({
  assigneeId: z.string().uuid().optional().or(z.literal('')),
});

function normalizeOptionalText(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

function normalizeDueDate(value: string | null | undefined) {
  if (!value) return null;

  const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(value);
  if (!parsed.success) return undefined;

  const dueDate = new Date(`${parsed.data}T12:00:00`);
  return Number.isNaN(dueDate.getTime()) ? undefined : dueDate;
}

function historyValue(value: unknown) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

export async function createTicket(formData: FormData) {
  const user = await requireAuth();

  const parsed = createSchema.safeParse({
    area: formData.get('area'),
    title: formData.get('title'),
    subcategory: formData.get('subcategory'),
    priority: formData.get('priority'),
    dueDate: formData.get('dueDate') || undefined,
    description: formData.get('description') || undefined,
    origin: formData.get('origin') || undefined,
    location: formData.get('location') || undefined,
    assigneeId: formData.get('assigneeId') || undefined,
  });

  if (!parsed.success) return { error: copy.validation.invalidData };

  const { area, title, subcategory, priority, dueDate, description, origin, location, assigneeId } =
    parsed.data;
  if (!(await isValidSubcategoryAsync(area, subcategory))) {
    return { error: copy.validation.invalidSubcategory };
  }

  const normalizedDueDate = normalizeDueDate(dueDate);
  if (normalizedDueDate === undefined) return { error: copy.validation.invalidDate };

  let activeAssigneeId: string | null = null;
  if (assigneeId) {
    const assignee = await getEligibleAssigneeForArea(assigneeId, area);
    if (!assignee) return { error: copy.validation.ineligibleAssignee };
    activeAssigneeId = assignee.id;
  } else {
    const defaultAssignee = await getDefaultAssigneeForArea(area);
    activeAssigneeId = defaultAssignee?.id ?? null;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = await generateCode(area);
    try {
      const [created] = await db.insert(tickets).values({
        code,
        area,
        title,
        subcategory,
        priority,
        dueDate: normalizedDueDate,
        description: normalizeOptionalText(description),
        origin: normalizeOptionalText(origin),
        location: normalizeOptionalText(location),
        assigneeId: activeAssigneeId,
        authorId: user.id,
      }).returning({ id: tickets.id });

      const emailResult = await sendTicketNotification({
        type: 'ticket_created',
        actorName: user.name ?? user.username,
        ticket: {
          code,
          area,
          title,
          subcategory,
          priority,
          status: 'aberto',
          origin: normalizeOptionalText(origin),
        },
      });

      if (activeAssigneeId && activeAssigneeId !== user.id) {
        await dispatchNotification({
          userIds: [activeAssigneeId],
          type: 'ticket_assigned',
          title: `Nova demanda atribuída a você: ${code}`,
          body: title,
          link: `/tickets/${code}`,
          ticketId: created.id,
        });
      }

      revalidatePath('/');
      revalidatePath('/tickets');
      revalidatePath('/kanban');
      return {
        code,
        emailWarning: emailResult.ok ? undefined : copy.validation.emailNotificationFailed,
      };
    } catch (error) {
      if (attempt < 4 && isUniqueConstraintError(error)) continue;
      throw error;
    }
  }

  return { error: copy.validation.invalidData };
}

export async function updateTicketStatus(code: string, newStatus: Status) {
  const user = await requireAuth();
  const parsedStatus = statusSchema.safeParse(newStatus);
  if (!parsedStatus.success) return { error: copy.validation.invalidData };

  const [ticket] = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      origin: tickets.origin,
      resolvedAt: tickets.resolvedAt,
      authorId: tickets.authorId,
      assigneeId: tickets.assigneeId,
    })
    .from(tickets)
    .where(eq(tickets.code, code))
    .limit(1);

  if (!ticket) return { error: copy.validation.invalidTicket };
  if (!canManageTicket(user, ticket)) return { error: copy.auth.errors.permissionDenied };
  if (ticket.status === parsedStatus.data) return { ok: true };

  const now = new Date();
  await db
    .update(tickets)
    .set({
      status: parsedStatus.data,
      updatedAt: now,
      resolvedAt: nextResolvedAt(ticket.status, parsedStatus.data, ticket.resolvedAt),
    })
    .where(eq(tickets.code, code));

  await recordHistory(ticket.id, user.id, 'status', ticket.status, parsedStatus.data);
  await sendTicketNotification({
    type: 'ticket_status_updated',
    actorName: user.name ?? user.username,
    status: parsedStatus.data,
    ticket: {
      code: ticket.code,
      area: ticket.area,
      title: ticket.title,
      subcategory: ticket.subcategory,
      priority: ticket.priority,
      status: parsedStatus.data,
      origin: ticket.origin,
    },
  });

  await dispatchNotification({
    userIds: [ticket.authorId, ticket.assigneeId].filter(
      (id): id is string => Boolean(id && id !== user.id),
    ),
    type: 'ticket_status_updated',
    title: `Status atualizado: ${ticket.code}`,
    body: `${ticket.title} agora está como ${parsedStatus.data}.`,
    link: `/tickets/${ticket.code}`,
    ticketId: ticket.id,
  });

  revalidatePath('/');
  revalidatePath('/tickets');
  revalidatePath('/kanban');
  revalidatePath(`/tickets/${code}`);
  return { ok: true };
}

const updateFieldSchema = z.object({
  field: z.enum([
    'title',
    'description',
    'origin',
    'location',
    'priority',
    'assigneeId',
    'subcategory',
    'dueDate',
  ]),
  value: z.string().nullable(),
});

async function normalizeFieldValue(
  ticket: { area: Area },
  field: z.infer<typeof updateFieldSchema>['field'],
  value: string | null,
) {
  if (field === 'title') {
    const parsed = z.string().trim().min(1).max(80).safeParse(value);
    return parsed.success ? { value: parsed.data } : { error: copy.validation.invalidData };
  }

  if (field === 'description') {
    const parsed = z.string().trim().max(4000).nullable().safeParse(value);
    return parsed.success
      ? { value: normalizeOptionalText(parsed.data ?? undefined) }
      : { error: copy.validation.invalidData };
  }

  if (field === 'origin' || field === 'location') {
    const parsed = z.string().trim().max(120).nullable().safeParse(value);
    return parsed.success
      ? { value: normalizeOptionalText(parsed.data ?? undefined) }
      : { error: copy.validation.invalidData };
  }

  if (field === 'priority') {
    const parsed = prioritySchema.safeParse(value);
    return parsed.success ? { value: parsed.data } : { error: copy.validation.invalidData };
  }

  if (field === 'dueDate') {
    const parsed = normalizeDueDate(value);
    return parsed !== undefined ? { value: parsed } : { error: copy.validation.invalidDate };
  }

  if (field === 'subcategory') {
    const parsed = z.string().trim().min(1).max(80).safeParse(value);
    if (!parsed.success) return { error: copy.validation.invalidSubcategory };
    if (!(await isValidSubcategoryAsync(ticket.area, parsed.data))) {
      return { error: copy.validation.invalidSubcategory };
    }
    return { value: parsed.data };
  }

  if (field === 'assigneeId') {
    if (!value) return { value: null };
    const parsed = z.string().uuid().safeParse(value);
    if (!parsed.success) return { error: copy.validation.invalidData };

    const assignee = await getEligibleAssigneeForArea(parsed.data, ticket.area);
    return assignee ? { value: assignee.id } : { error: copy.validation.ineligibleAssignee };
  }

  return { error: copy.validation.invalidField };
}

export async function updateTicketField(code: string, field: string, value: string | null) {
  const user = await requireAuth();
  const parsed = updateFieldSchema.safeParse({ field, value });
  if (!parsed.success) return { error: copy.validation.invalidField };

  const [ticket] = await db.select().from(tickets).where(eq(tickets.code, code)).limit(1);
  if (!ticket) return { error: copy.validation.invalidTicket };
  if (!canManageTicket(user, ticket)) return { error: copy.auth.errors.permissionDenied };

  const normalized = await normalizeFieldValue(ticket, parsed.data.field, parsed.data.value);
  if ('error' in normalized) return { error: normalized.error };

  const rawOld = ticket[parsed.data.field];
  const oldValue = historyValue(rawOld);
  const newValue = historyValue(normalized.value);
  if (oldValue === newValue) return { ok: true };

  const updates: Partial<NewTicket> = { updatedAt: new Date() };
  Object.assign(updates, { [parsed.data.field]: normalized.value });

  await db.update(tickets).set(updates).where(eq(tickets.code, code));

  if (parsed.data.field === 'assigneeId') {
    const [oldName, newName] = await Promise.all([
      resolveUserName(oldValue),
      resolveUserName(newValue),
    ]);
    await recordHistory(ticket.id, user.id, 'responsavel', oldName, newName);
    if (newValue && newValue !== user.id) {
      await dispatchNotification({
        userIds: [newValue],
        type: 'ticket_assigned',
        title: `Demanda atribuída a você: ${ticket.code}`,
        body: ticket.title,
        link: `/tickets/${ticket.code}`,
        ticketId: ticket.id,
      });
    }
  } else {
    await recordHistory(ticket.id, user.id, parsed.data.field, oldValue, newValue);
  }

  revalidatePath('/');
  revalidatePath(`/tickets/${code}`);
  revalidatePath('/tickets');
  revalidatePath('/kanban');
  return { ok: true };
}

export async function updateTicketDetails(code: string, formData: FormData) {
  const user = await requireAuth();

  const parsed = ticketDetailsSchema.safeParse({
    area: formData.get('area'),
    title: formData.get('title'),
    subcategory: formData.get('subcategory'),
    priority: formData.get('priority'),
    dueDate: formData.get('dueDate') || undefined,
    description: formData.get('description') || undefined,
    origin: formData.get('origin') || undefined,
    location: formData.get('location') || undefined,
  });

  if (!parsed.success) return { error: copy.validation.invalidData };

  const [ticket] = await db.select().from(tickets).where(eq(tickets.code, code)).limit(1);
  if (!ticket) return { error: copy.validation.invalidTicket };
  if (!canManageTicket(user, ticket)) return { error: copy.auth.errors.permissionDenied };
  if (
    parsed.data.area !== ticket.area ||
    !(await isValidSubcategoryAsync(ticket.area, parsed.data.subcategory))
  ) {
    return { error: copy.validation.invalidSubcategory };
  }

  const normalizedDueDate = normalizeDueDate(parsed.data.dueDate);
  if (normalizedDueDate === undefined) return { error: copy.validation.invalidDate };

  const next = {
    title: parsed.data.title,
    subcategory: parsed.data.subcategory,
    priority: parsed.data.priority,
    dueDate: normalizedDueDate,
    description: normalizeOptionalText(parsed.data.description),
    origin: normalizeOptionalText(parsed.data.origin),
    location: normalizeOptionalText(parsed.data.location),
  };

  const changes: Array<{
    field: keyof typeof next;
    oldValue: string | null;
    newValue: string | null;
  }> = [];

  for (const field of Object.keys(next) as Array<keyof typeof next>) {
    const oldValue = historyValue(ticket[field]);
    const newValue = historyValue(next[field]);
    if (oldValue !== newValue) changes.push({ field, oldValue, newValue });
  }

  if (changes.length === 0) return { ok: true };

  await db
    .update(tickets)
    .set({ ...next, updatedAt: new Date() })
    .where(eq(tickets.code, code));

  await Promise.all(
    changes.map((change) =>
      recordHistory(ticket.id, user.id, change.field, change.oldValue, change.newValue),
    ),
  );

  revalidatePath('/');
  revalidatePath(`/tickets/${code}`);
  revalidatePath('/tickets');
  revalidatePath('/kanban');
  return { ok: true };
}

const bulkActionSchema = z.object({
  codes: z.array(z.string()).min(1).max(100),
  action: z.enum(['set_status', 'set_assignee', 'set_priority', 'archive']),
  value: z.string().nullable().optional(),
});

export async function bulkUpdateTickets(input: {
  codes: string[];
  action: 'set_status' | 'set_assignee' | 'set_priority' | 'archive';
  value?: string | null;
}) {
  const user = await requireAuth();
  const parsed = bulkActionSchema.safeParse(input);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const { codes, action, value } = parsed.data;

  const ticketsToUpdate = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      status: tickets.status,
      resolvedAt: tickets.resolvedAt,
      priority: tickets.priority,
      authorId: tickets.authorId,
      assigneeId: tickets.assigneeId,
      assigneeName: ticketAssignee.displayName,
    })
    .from(tickets)
    .leftJoin(ticketAssignee, eq(tickets.assigneeId, ticketAssignee.id))
    .where(inArray(tickets.code, codes));

  if (ticketsToUpdate.length === 0) return { error: copy.validation.invalidTicket };
  if (ticketsToUpdate.some((ticket) => !canManageTicket(user, ticket))) {
    return { error: copy.auth.errors.permissionDenied };
  }

  let updates: Partial<NewTicket> = { updatedAt: new Date() };
  let historyField = '';
  let historyNewValue: string | null = null;
  let notifyAssigneeId: string | null = null;

  if (action === 'archive') {
    updates = { ...updates, status: 'arquivado' };
    historyField = 'status';
    historyNewValue = 'arquivado';
  } else if (action === 'set_status') {
    const parsedStatus = statusSchema.safeParse(value);
    if (!parsedStatus.success) return { error: copy.validation.invalidData };
    historyField = 'status';
    historyNewValue = parsedStatus.data;

    const now = new Date();
    for (const ticket of ticketsToUpdate) {
      await db
        .update(tickets)
        .set({
          status: parsedStatus.data,
          updatedAt: now,
          resolvedAt: nextResolvedAt(ticket.status, parsedStatus.data, ticket.resolvedAt),
        })
        .where(eq(tickets.id, ticket.id));
    }

    await db.insert(ticketHistory).values(
      ticketsToUpdate.map((t) => ({
        ticketId: t.id,
        authorId: user.id,
        field: historyField,
        oldValue: t.status,
        newValue: historyNewValue,
      })),
    );

    await Promise.all(
      ticketsToUpdate.map((ticket) =>
        dispatchNotification({
          userIds: [ticket.authorId, ticket.assigneeId].filter(
            (id): id is string => Boolean(id && id !== user.id),
          ),
          type: 'ticket_status_updated',
          title: `Status atualizado: ${ticket.code}`,
          body: `${ticket.title} agora está como ${STATUS_LABELS[parsedStatus.data]}.`,
          link: `/tickets/${ticket.code}`,
          ticketId: ticket.id,
        }),
      ),
    );

    revalidatePath('/');
    revalidatePath('/tickets');
    revalidatePath('/kanban');
    return { ok: true, updated: ticketsToUpdate.length };
  } else if (action === 'set_priority') {
    const parsedPriority = prioritySchema.safeParse(value);
    if (!parsedPriority.success) return { error: copy.validation.invalidData };
    updates = { ...updates, priority: parsedPriority.data };
    historyField = 'priority';
    historyNewValue = parsedPriority.data;
  } else if (action === 'set_assignee') {
    if (value === null || value === '' || value === 'unassigned') {
      updates = { ...updates, assigneeId: null };
      historyField = 'responsavel';
      historyNewValue = null;
    } else {
      const parsedId = z.string().uuid().safeParse(value);
      if (!parsedId.success) return { error: copy.validation.invalidData };

      const areas = new Set(ticketsToUpdate.map((ticket) => ticket.area));
      if (areas.size !== 1) return { error: copy.validation.ineligibleAssignee };
      const [area] = [...areas];
      const assignee = await getEligibleAssigneeForArea(parsedId.data, area);
      if (!assignee) return { error: copy.validation.ineligibleAssignee };
      updates = { ...updates, assigneeId: assignee.id };
      historyField = 'responsavel';
      historyNewValue = assignee.displayName;
      notifyAssigneeId = assignee.id;
    }
  }

  await db
    .update(tickets)
    .set(updates)
    .where(inArray(tickets.id, ticketsToUpdate.map((t) => t.id)));

  await db.insert(ticketHistory).values(
    ticketsToUpdate.map((t) => ({
      ticketId: t.id,
      authorId: user.id,
      field: historyField,
      oldValue:
        action === 'archive'
          ? t.status
          : action === 'set_priority'
            ? t.priority
            : (t.assigneeName ?? null),
      newValue: historyNewValue,
    })),
  );

  if (action === 'archive') {
    await Promise.all(
      ticketsToUpdate.map((ticket) =>
        dispatchNotification({
          userIds: [ticket.authorId, ticket.assigneeId].filter(
            (id): id is string => Boolean(id && id !== user.id),
          ),
          type: 'ticket_status_updated',
          title: `Demanda arquivada: ${ticket.code}`,
          body: ticket.title,
          link: `/tickets/${ticket.code}`,
          ticketId: ticket.id,
        }),
      ),
    );
  }

  if (action === 'set_assignee' && notifyAssigneeId && notifyAssigneeId !== user.id) {
    await Promise.all(
      ticketsToUpdate.map((ticket) =>
        dispatchNotification({
          userIds: [notifyAssigneeId],
          type: 'ticket_assigned',
          title: `Demanda atribuída a você: ${ticket.code}`,
          body: ticket.title,
          link: `/tickets/${ticket.code}`,
          ticketId: ticket.id,
        }),
      ),
    );
  }

  revalidatePath('/');
  revalidatePath('/tickets');
  revalidatePath('/kanban');
  return { ok: true, updated: ticketsToUpdate.length };
}

export async function deleteTicket(code: string) {
  const user = await requireAdmin();
  if (!user) return { error: copy.auth.errors.permissionDenied };

  const [ticket] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.code, code))
    .limit(1);
  if (!ticket) return { error: copy.validation.invalidTicket };

  await db.delete(tickets).where(eq(tickets.code, code));

  revalidatePath('/');
  revalidatePath('/tickets');
  revalidatePath('/kanban');
  revalidatePath(`/tickets/${code}`);
  return { ok: true };
}

function buildAttentionCondition(now = new Date()) {
  const staleDate = new Date(now.getTime() - ATTENTION_STALE_DAYS * 24 * 60 * 60 * 1000);

  return and(
    inArray(tickets.status, ['aberto', 'em_andamento', 'aguardando']),
    or(
      eq(tickets.priority, 'urgente'),
      eq(tickets.status, 'aguardando'),
      isNull(tickets.assigneeId),
      lte(tickets.updatedAt, staleDate),
    ),
  );
}

function buildTicketConditions(filters?: TicketFilters) {
  const { area, status, priority, assigneeId, origin, search, attention, due } = filters ?? {};
  const conditions = [];
  const normalizedSearch = search?.trim();

  const parsedArea = area && area !== 'all' ? areaSchema.safeParse(area) : null;
  if (parsedArea?.success) conditions.push(eq(tickets.area, parsedArea.data));

  if (attention === 'true') conditions.push(buildAttentionCondition());

  if (due === 'overdue') {
    conditions.push(
      and(
        sql`${tickets.dueDate} IS NOT NULL`,
        lte(tickets.dueDate, new Date()),
        inArray(tickets.status, ['aberto', 'em_andamento', 'aguardando']),
      ),
    );
  }

  if (status === 'ativas') {
    conditions.push(inArray(tickets.status, ['aberto', 'em_andamento', 'aguardando']));
  } else if (status && status !== 'all') {
    const parsedStatus = statusSchema.safeParse(status);
    if (parsedStatus.success) {
      conditions.push(eq(tickets.status, parsedStatus.data));
    } else {
      conditions.push(ne(tickets.status, 'arquivado'));
    }
  } else {
    conditions.push(ne(tickets.status, 'arquivado'));
  }

  const parsedPriority = priority && priority !== 'all' ? prioritySchema.safeParse(priority) : null;
  if (parsedPriority?.success) conditions.push(eq(tickets.priority, parsedPriority.data));

  if (assigneeId && assigneeId !== 'all') {
    if (assigneeId === 'unassigned') {
      conditions.push(sql`${tickets.assigneeId} IS NULL`);
    } else {
      const parsedAssigneeId = z.string().uuid().safeParse(assigneeId);
      if (parsedAssigneeId.success) conditions.push(eq(tickets.assigneeId, parsedAssigneeId.data));
    }
  }

  if (origin === 'public') {
    conditions.push(eq(tickets.origin, 'Pagina publica'));
  } else if (origin === 'internal') {
    conditions.push(or(sql`${tickets.origin} IS NULL`, ne(tickets.origin, 'Pagina publica')));
  }

  if (normalizedSearch) {
    conditions.push(
      or(
        ilike(tickets.title, `%${normalizedSearch}%`),
        ilike(tickets.code, `%${normalizedSearch}%`),
        ilike(tickets.subcategory, `%${normalizedSearch}%`),
        ilike(sql`COALESCE(${tickets.origin}, '')`, `%${normalizedSearch}%`),
        ilike(sql`COALESCE(${tickets.description}, '')`, `%${normalizedSearch}%`),
      ),
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function priorityOrderExpression() {
  return sql`
    case ${tickets.priority}
      when 'urgente' then 0
      when 'alta' then 1
      when 'media' then 2
      else 3
    end
  `;
}

function getTicketOrder(sort?: string) {
  const parsedSort = sortSchema.safeParse(sort);

  if (parsedSort.success && parsedSort.data === 'updated_desc') {
    return [desc(tickets.updatedAt), desc(tickets.createdAt)];
  }

  if (parsedSort.success && parsedSort.data === 'priority') {
    return [priorityOrderExpression(), desc(tickets.updatedAt), desc(tickets.createdAt)];
  }

  return [desc(tickets.createdAt)];
}

export type TicketRow = Awaited<ReturnType<typeof getTickets>>[number];

export async function getTickets(filters?: TicketFilters & { page?: number }) {
  const user = await requireAuth();
  const { page = 1 } = filters ?? {};
  const limit = 50;
  const offset = (page - 1) * limit;
  const where = buildTicketConditions(filters);

  const rows = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      origin: tickets.origin,
      publicContact: tickets.publicContact,
      description: tickets.description,
      dueDate: tickets.dueDate,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      resolvedAt: tickets.resolvedAt,
      authorId: tickets.authorId,
      assigneeId: tickets.assigneeId,
      authorName: users.displayName,
      assigneeName: ticketAssignee.displayName,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.authorId, users.id))
    .leftJoin(ticketAssignee, eq(tickets.assigneeId, ticketAssignee.id))
    .where(where)
    .orderBy(...getTicketOrder(filters?.sort))
    .limit(limit)
    .offset(offset);

  return rows.map((ticket) => protectPublicRequesterData(ticket, user));
}

export async function getTicketCount(filters?: TicketFilters) {
  await requireAuth();
  const [result] = await db
    .select({ total: count() })
    .from(tickets)
    .where(buildTicketConditions(filters));

  return Number(result?.total ?? 0);
}

export async function exportTicketRows(filters?: TicketFilters) {
  const user = await requireAuth();

  const rows = await db
    .select({
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      origin: tickets.origin,
      publicContact: tickets.publicContact,
      description: tickets.description,
      dueDate: tickets.dueDate,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      resolvedAt: tickets.resolvedAt,
      authorName: users.displayName,
      assigneeName: ticketAssignee.displayName,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.authorId, users.id))
    .leftJoin(ticketAssignee, eq(tickets.assigneeId, ticketAssignee.id))
    .where(buildTicketConditions(filters))
    .orderBy(...getTicketOrder(filters?.sort))
    .limit(EXPORT_TICKET_LIMIT + 1);

  return {
    rows: rows.slice(0, EXPORT_TICKET_LIMIT).map((ticket) => ({
      ...protectPublicRequesterData(ticket, user),
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      dueDate: ticket.dueDate?.toISOString() ?? null,
    })),
    truncated: rows.length > EXPORT_TICKET_LIMIT,
    limit: EXPORT_TICKET_LIMIT,
  };
}

export async function getTicket(code: string) {
  const user = await requireAuth();
  const ticketAuthor = alias(users, 'ticket_author');

  const [row] = await db
    .select({
      ticket: tickets,
      author: {
        id: ticketAuthor.id,
        displayName: ticketAuthor.displayName,
        username: ticketAuthor.username,
      },
      assignee: {
        id: ticketAssignee.id,
        displayName: ticketAssignee.displayName,
        username: ticketAssignee.username,
      },
    })
    .from(tickets)
    .leftJoin(ticketAuthor, eq(tickets.authorId, ticketAuthor.id))
    .leftJoin(ticketAssignee, eq(tickets.assigneeId, ticketAssignee.id))
    .where(eq(tickets.code, code))
    .limit(1);

  if (!row) return null;

  return {
    ...protectPublicRequesterData(row.ticket, user),
    author: row.author?.id ? row.author : null,
    assignee: row.assignee?.id ? row.assignee : null,
  };
}

export async function getDashboardStats() {
  await requireAuth();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Single round-trip: PostgreSQL evaluates each FILTER independently in one pass.
  const [row] = await db
    .select({
      abertosTI: sql<number>`count(*) filter (where ${tickets.area} = 'TI' and ${tickets.status} = 'aberto')`,
      abertosMKT: sql<number>`count(*) filter (where ${tickets.area} = 'MKT' and ${tickets.status} = 'aberto')`,
      abertosPF: sql<number>`count(*) filter (where ${tickets.area} = 'PF' and ${tickets.status} = 'aberto')`,
      urgentes: sql<number>`count(*) filter (where ${tickets.priority} = 'urgente' and ${tickets.status} in ('aberto', 'em_andamento'))`,
      aguardando: sql<number>`count(*) filter (where ${tickets.status} = 'aguardando')`,
      atrasadas: sql<number>`count(*) filter (where ${tickets.dueDate} is not null and ${tickets.dueDate} <= now() and ${tickets.status} in ('aberto', 'em_andamento', 'aguardando'))`,
      resolvidosSemana: sql<number>`count(*) filter (where ${tickets.status} = 'resolvido' and ${tickets.resolvedAt} >= ${weekAgo})`,
    })
    .from(tickets);

  return {
    abertosTI: Number(row?.abertosTI ?? 0),
    abertosMKT: Number(row?.abertosMKT ?? 0),
    abertosPF: Number(row?.abertosPF ?? 0),
    urgentes: Number(row?.urgentes ?? 0),
    aguardando: Number(row?.aguardando ?? 0),
    atrasadas: Number(row?.atrasadas ?? 0),
    resolvidosSemana: Number(row?.resolvidosSemana ?? 0),
  };
}

export async function getTicketTrend(days = 14) {
  await requireAuth();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const created = await db
    .select({
      day: sql<string>`to_char(${tickets.createdAt}, 'YYYY-MM-DD')`,
      total: sql<number>`count(*)`,
    })
    .from(tickets)
    .where(sql`${tickets.createdAt} >= ${start}`)
    .groupBy(sql`to_char(${tickets.createdAt}, 'YYYY-MM-DD')`);

  const resolved = await db
    .select({
      day: sql<string>`to_char(${tickets.resolvedAt}, 'YYYY-MM-DD')`,
      total: sql<number>`count(*)`,
    })
    .from(tickets)
    .where(
      and(
        sql`${tickets.resolvedAt} IS NOT NULL`,
        sql`${tickets.resolvedAt} >= ${start}`,
      ),
    )
    .groupBy(sql`to_char(${tickets.resolvedAt}, 'YYYY-MM-DD')`);

  const createdMap = new Map(created.map((c) => [c.day, Number(c.total)]));
  const resolvedMap = new Map(resolved.map((r) => [r.day, Number(r.total)]));

  const result: Array<{ day: string; created: number; resolved: number }> = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    result.push({
      day: key,
      created: createdMap.get(key) ?? 0,
      resolved: resolvedMap.get(key) ?? 0,
    });
  }
  return result;
}

export async function getAvgResolutionTime(days = 30) {
  await requireAuth();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      area: tickets.area,
      avgHours: sql<number>`coalesce(avg(extract(epoch from (${tickets.resolvedAt} - ${tickets.createdAt}))/3600), 0)`,
      total: sql<number>`count(*)`,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.status, 'resolvido'),
        sql`${tickets.resolvedAt} IS NOT NULL`,
        sql`${tickets.resolvedAt} >= ${since}`,
      ),
    )
    .groupBy(tickets.area);

  return {
    TI: {
      avgHours: Number(rows.find((r) => r.area === 'TI')?.avgHours ?? 0),
      total: Number(rows.find((r) => r.area === 'TI')?.total ?? 0),
    },
    MKT: {
      avgHours: Number(rows.find((r) => r.area === 'MKT')?.avgHours ?? 0),
      total: Number(rows.find((r) => r.area === 'MKT')?.total ?? 0),
    },
    PF: {
      avgHours: Number(rows.find((r) => r.area === 'PF')?.avgHours ?? 0),
      total: Number(rows.find((r) => r.area === 'PF')?.total ?? 0),
    },
  };
}

export async function getActivityFeed(limit = 30) {
  await requireAuth();
  const rows = await db
    .select({
      id: ticketHistory.id,
      ticketCode: tickets.code,
      ticketTitle: tickets.title,
      ticketArea: tickets.area,
      field: ticketHistory.field,
      oldValue: ticketHistory.oldValue,
      newValue: ticketHistory.newValue,
      authorName: users.displayName,
      createdAt: ticketHistory.createdAt,
    })
    .from(ticketHistory)
    .innerJoin(tickets, eq(ticketHistory.ticketId, tickets.id))
    .leftJoin(users, eq(ticketHistory.authorId, users.id))
    .orderBy(desc(ticketHistory.createdAt))
    .limit(limit);

  return rows;
}

export async function getAreaDistribution() {
  await requireAuth();
  const rows = await db
    .select({
      area: tickets.area,
      total: sql<number>`count(*)`,
    })
    .from(tickets)
    .where(inArray(tickets.status, ['aberto', 'em_andamento', 'aguardando']))
    .groupBy(tickets.area);

  return {
    TI: Number(rows.find((r) => r.area === 'TI')?.total ?? 0),
    MKT: Number(rows.find((r) => r.area === 'MKT')?.total ?? 0),
    PF: Number(rows.find((r) => r.area === 'PF')?.total ?? 0),
  };
}

function daysSince(date: Date | string, now = new Date()) {
  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(date).getTime()) / (24 * 60 * 60 * 1000)),
  );
}

function priorityRank(priority: Priority) {
  return { urgente: 0, alta: 1, media: 2, baixa: 3 }[priority];
}

export async function getAttentionTickets() {
  await requireAuth();
  const now = new Date();

  const rows = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      assigneeId: tickets.assigneeId,
      assigneeName: ticketAssignee.displayName,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .leftJoin(ticketAssignee, eq(tickets.assigneeId, ticketAssignee.id))
    .where(buildAttentionCondition(now))
    .orderBy(desc(tickets.updatedAt))
    .limit(60);

  return rows
    .map((ticket) => {
      const stalledDays = daysSince(ticket.updatedAt, now);
      const reason =
        ticket.priority === 'urgente'
          ? copy.dashboard.attention.reasons.urgent
          : ticket.status === 'aguardando'
            ? copy.dashboard.attention.reasons.waiting
            : !ticket.assigneeId
              ? copy.dashboard.attention.reasons.unassigned
              : copy.dashboard.attention.reasons.stale(stalledDays);
      const rank =
        ticket.priority === 'urgente'
          ? 0
          : ticket.status === 'aguardando'
            ? 1
            : !ticket.assigneeId
              ? 2
              : 3;

      return {
        ...ticket,
        reason,
        rank,
        ageDays: daysSince(ticket.createdAt, now),
        stalledDays,
      };
    })
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      const priority = priorityRank(a.priority) - priorityRank(b.priority);
      if (priority !== 0) return priority;
      return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    })
    .slice(0, 6);
}

export async function getKanbanTickets(filters?: {
  area?: string;
  assigneeId?: string;
  priority?: string;
  search?: string;
}): Promise<KanbanTicket[]> {
  await requireAuth();
  const { area, assigneeId, priority, search } = filters ?? {};
  const conditions = [];
  const normalizedSearch = search?.trim();
  const parsedArea = area && area !== 'all' ? areaSchema.safeParse(area) : null;
  if (parsedArea?.success) conditions.push(eq(tickets.area, parsedArea.data));
  const parsedPriority = priority && priority !== 'all' ? prioritySchema.safeParse(priority) : null;
  if (parsedPriority?.success) conditions.push(eq(tickets.priority, parsedPriority.data));
  if (assigneeId && assigneeId !== 'all') {
    if (assigneeId === 'unassigned') {
      conditions.push(sql`${tickets.assigneeId} IS NULL`);
    } else {
      const parsedAssigneeId = z.string().uuid().safeParse(assigneeId);
      if (parsedAssigneeId.success) conditions.push(eq(tickets.assigneeId, parsedAssigneeId.data));
    }
  }
  if (normalizedSearch) {
    conditions.push(
      or(
        ilike(tickets.title, `%${normalizedSearch}%`),
        ilike(tickets.code, `%${normalizedSearch}%`),
        ilike(tickets.subcategory, `%${normalizedSearch}%`),
        ilike(sql`COALESCE(${tickets.origin}, '')`, `%${normalizedSearch}%`),
        ilike(sql`COALESCE(${tickets.description}, '')`, `%${normalizedSearch}%`),
        ilike(sql`COALESCE(${users.displayName}, '')`, `%${normalizedSearch}%`),
      ),
    );
  }
  conditions.push(
    or(
      eq(tickets.status, 'aberto'),
      eq(tickets.status, 'em_andamento'),
      eq(tickets.status, 'aguardando'),
      eq(tickets.status, 'resolvido'),
    ),
  );

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      assigneeId: tickets.assigneeId,
      assigneeName: users.displayName,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assigneeId, users.id))
    .where(where)
    .orderBy(priorityOrderExpression(), desc(tickets.updatedAt));

  return rows.map((row) => ({
    ...row,
    status: row.status as BoardStatus,
  }));
}

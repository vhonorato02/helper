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
  gte,
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
import { isValidSubcategory, type Area, type Priority, type Status } from '@/lib/constants';

const areaSchema = z.enum(['TI', 'MKT']);
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
  search?: string;
  attention?: string;
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
  description: z.string().trim().max(4000).optional(),
  origin: z.string().trim().max(120).optional(),
});

const createSchema = ticketDetailsSchema.extend({
  assigneeId: z.string().uuid().optional().or(z.literal('')),
});

function normalizeOptionalText(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

export async function createTicket(formData: FormData) {
  const user = await requireAuth();

  const parsed = createSchema.safeParse({
    area: formData.get('area'),
    title: formData.get('title'),
    subcategory: formData.get('subcategory'),
    priority: formData.get('priority'),
    description: formData.get('description') || undefined,
    origin: formData.get('origin') || undefined,
    assigneeId: formData.get('assigneeId') || undefined,
  });

  if (!parsed.success) return { error: copy.validation.invalidData };

  const { area, title, subcategory, priority, description, origin, assigneeId } = parsed.data;
  if (!isValidSubcategory(area, subcategory)) {
    return { error: copy.validation.invalidSubcategory };
  }

  let activeAssigneeId: string | null = null;
  if (assigneeId) {
    const [assignee] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, assigneeId), eq(users.isActive, true)))
      .limit(1);
    if (!assignee) return { error: copy.validation.invalidUser };
    activeAssigneeId = assignee.id;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = await generateCode(area);
    try {
      await db.insert(tickets).values({
        code,
        area,
        title,
        subcategory,
        priority,
        description: normalizeOptionalText(description),
        origin: normalizeOptionalText(origin),
        assigneeId: activeAssigneeId,
        authorId: user.id,
      });

      revalidatePath('/');
      revalidatePath('/tickets');
      revalidatePath('/kanban');
      return { code };
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
    .select({ id: tickets.id, status: tickets.status })
    .from(tickets)
    .where(eq(tickets.code, code))
    .limit(1);

  if (!ticket) return { error: copy.validation.invalidTicket };
  if (ticket.status === parsedStatus.data) return { ok: true };

  const now = new Date();
  await db
    .update(tickets)
    .set({
      status: parsedStatus.data,
      updatedAt: now,
      resolvedAt: parsedStatus.data === 'resolvido' ? now : null,
    })
    .where(eq(tickets.code, code));

  await recordHistory(ticket.id, user.id, 'status', ticket.status, parsedStatus.data);

  revalidatePath('/');
  revalidatePath('/tickets');
  revalidatePath('/kanban');
  revalidatePath(`/tickets/${code}`);
  return { ok: true };
}

const updateFieldSchema = z.object({
  field: z.enum(['title', 'description', 'origin', 'priority', 'assigneeId', 'subcategory']),
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

  if (field === 'origin') {
    const parsed = z.string().trim().max(120).nullable().safeParse(value);
    return parsed.success
      ? { value: normalizeOptionalText(parsed.data ?? undefined) }
      : { error: copy.validation.invalidData };
  }

  if (field === 'priority') {
    const parsed = prioritySchema.safeParse(value);
    return parsed.success ? { value: parsed.data } : { error: copy.validation.invalidData };
  }

  if (field === 'subcategory') {
    const parsed = z.string().trim().min(1).max(80).safeParse(value);
    if (!parsed.success || !isValidSubcategory(ticket.area, parsed.data)) {
      return { error: copy.validation.invalidSubcategory };
    }
    return { value: parsed.data };
  }

  if (field === 'assigneeId') {
    if (!value) return { value: null };
    const parsed = z.string().uuid().safeParse(value);
    if (!parsed.success) return { error: copy.validation.invalidData };

    const [assignee] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, parsed.data), eq(users.isActive, true)))
      .limit(1);
    return assignee ? { value: assignee.id } : { error: copy.validation.invalidUser };
  }

  return { error: copy.validation.invalidField };
}

export async function updateTicketField(code: string, field: string, value: string | null) {
  const user = await requireAuth();
  const parsed = updateFieldSchema.safeParse({ field, value });
  if (!parsed.success) return { error: copy.validation.invalidField };

  const [ticket] = await db.select().from(tickets).where(eq(tickets.code, code)).limit(1);
  if (!ticket) return { error: copy.validation.invalidTicket };

  const normalized = await normalizeFieldValue(ticket, parsed.data.field, parsed.data.value);
  if ('error' in normalized) return { error: normalized.error };

  const rawOld = ticket[parsed.data.field];
  const oldValue = rawOld != null ? String(rawOld) : null;
  const newValue = normalized.value != null ? String(normalized.value) : null;
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
    description: formData.get('description') || undefined,
    origin: formData.get('origin') || undefined,
  });

  if (!parsed.success) return { error: copy.validation.invalidData };

  const [ticket] = await db.select().from(tickets).where(eq(tickets.code, code)).limit(1);
  if (!ticket) return { error: copy.validation.invalidTicket };
  if (parsed.data.area !== ticket.area || !isValidSubcategory(ticket.area, parsed.data.subcategory)) {
    return { error: copy.validation.invalidSubcategory };
  }

  const next = {
    title: parsed.data.title,
    subcategory: parsed.data.subcategory,
    priority: parsed.data.priority,
    description: normalizeOptionalText(parsed.data.description),
    origin: normalizeOptionalText(parsed.data.origin),
  };

  const changes: Array<{
    field: keyof typeof next;
    oldValue: string | null;
    newValue: string | null;
  }> = [];

  for (const field of Object.keys(next) as Array<keyof typeof next>) {
    const oldValue = ticket[field] != null ? String(ticket[field]) : null;
    const newValue = next[field] != null ? String(next[field]) : null;
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
  const { area, status, priority, assigneeId, search, attention } = filters ?? {};
  const conditions = [];
  const normalizedSearch = search?.trim();

  const parsedArea = area && area !== 'all' ? areaSchema.safeParse(area) : null;
  if (parsedArea?.success) conditions.push(eq(tickets.area, parsedArea.data));

  if (attention === 'true') conditions.push(buildAttentionCondition());

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
  const { page = 1 } = filters ?? {};
  const limit = 50;
  const offset = (page - 1) * limit;
  const where = buildTicketConditions(filters);

  return db
    .select({
      id: tickets.id,
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      origin: tickets.origin,
      description: tickets.description,
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
}

export async function getTicketCount(filters?: TicketFilters) {
  const [result] = await db
    .select({ total: count() })
    .from(tickets)
    .where(buildTicketConditions(filters));

  return Number(result?.total ?? 0);
}

export async function exportTicketRows(filters?: TicketFilters) {
  await requireAuth();

  const rows = await db
    .select({
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      origin: tickets.origin,
      description: tickets.description,
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
      ...ticket,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    })),
    truncated: rows.length > EXPORT_TICKET_LIMIT,
    limit: EXPORT_TICKET_LIMIT,
  };
}

export async function getTicket(code: string) {
  const [ticket] = await db.select().from(tickets).where(eq(tickets.code, code)).limit(1);
  if (!ticket) return null;

  const [author] = ticket.authorId
    ? await db
        .select({ id: users.id, displayName: users.displayName, username: users.username })
        .from(users)
        .where(eq(users.id, ticket.authorId))
        .limit(1)
    : [null];

  const [assignee] = ticket.assigneeId
    ? await db
        .select({ id: users.id, displayName: users.displayName, username: users.username })
        .from(users)
        .where(eq(users.id, ticket.assigneeId))
        .limit(1)
    : [null];

  return { ...ticket, author: author ?? null, assignee: assignee ?? null };
}

export async function getDashboardStats() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [abertosTI, abertosMKT, urgentes, aguardando, resolvidosSemana] = await Promise.all([
    db
      .select({ count: count() })
      .from(tickets)
      .where(and(eq(tickets.area, 'TI'), eq(tickets.status, 'aberto'))),
    db
      .select({ count: count() })
      .from(tickets)
      .where(and(eq(tickets.area, 'MKT'), eq(tickets.status, 'aberto'))),
    db
      .select({ count: count() })
      .from(tickets)
      .where(
        and(
          eq(tickets.priority, 'urgente'),
          or(eq(tickets.status, 'aberto'), eq(tickets.status, 'em_andamento')),
        ),
      ),
    db.select({ count: count() }).from(tickets).where(eq(tickets.status, 'aguardando')),
    db
      .select({ count: count() })
      .from(tickets)
      .where(and(eq(tickets.status, 'resolvido'), gte(tickets.resolvedAt, weekAgo))),
  ]);

  return {
    abertosTI: abertosTI[0]?.count ?? 0,
    abertosMKT: abertosMKT[0]?.count ?? 0,
    urgentes: urgentes[0]?.count ?? 0,
    aguardando: aguardando[0]?.count ?? 0,
    resolvidosSemana: resolvidosSemana[0]?.count ?? 0,
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
}) {
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

  return db
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
}

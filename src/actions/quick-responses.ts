'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { quickResponses, tickets, users } from '@/db/schema';
import { and, asc, desc, eq, isNull, ne, or } from 'drizzle-orm';
import { z } from 'zod';
import { copy } from '@/lib/copy';
import type { Area } from '@/lib/constants';

const areaSchema = z.enum(['TI', 'MKT', 'PF']);
const idSchema = z.string().uuid();
const quickResponseFormSchema = z.object({
  area: z.preprocess(
    (value) => (value === 'all' || value === '' ? null : value),
    areaSchema.nullable(),
  ),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(10).max(4000),
});

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

function scopeCondition(area: Area | null) {
  return area ? eq(quickResponses.area, area) : isNull(quickResponses.area);
}

function canManageQuickResponse(
  user: { id: string; isAdmin?: boolean },
  response: { createdById: string | null },
) {
  return user.isAdmin || response.createdById === user.id;
}

function revalidateQuickResponseSurfaces() {
  revalidatePath('/respostas-rapidas');
  revalidatePath('/tickets');
  revalidatePath('/kanban');
}

async function hasActiveDuplicate(title: string, area: Area | null, ignoreId?: string) {
  const conditions = [
    eq(quickResponses.title, title),
    eq(quickResponses.isActive, true),
    scopeCondition(area),
  ];
  if (ignoreId) conditions.push(ne(quickResponses.id, ignoreId));

  const [existing] = await db
    .select({ id: quickResponses.id })
    .from(quickResponses)
    .where(and(...conditions))
    .limit(1);

  return !!existing;
}

export async function getQuickResponses(includeInactive = false) {
  await requireAuth();

  return db
    .select({
      id: quickResponses.id,
      area: quickResponses.area,
      title: quickResponses.title,
      body: quickResponses.body,
      isActive: quickResponses.isActive,
      usageCount: quickResponses.usageCount,
      createdById: quickResponses.createdById,
      createdByName: users.displayName,
      createdAt: quickResponses.createdAt,
      updatedAt: quickResponses.updatedAt,
    })
    .from(quickResponses)
    .leftJoin(users, eq(quickResponses.createdById, users.id))
    .where(includeInactive ? undefined : eq(quickResponses.isActive, true))
    .orderBy(desc(quickResponses.isActive), asc(quickResponses.area), asc(quickResponses.title));
}

export async function getActiveQuickResponsesForTicket(ticketCode: string) {
  await requireAuth();
  const parsed = z.string().trim().min(1).max(24).safeParse(ticketCode);
  if (!parsed.success) return [];

  const [ticket] = await db
    .select({ area: tickets.area })
    .from(tickets)
    .where(eq(tickets.code, parsed.data))
    .limit(1);
  if (!ticket) return [];

  return db
    .select({
      id: quickResponses.id,
      area: quickResponses.area,
      title: quickResponses.title,
      body: quickResponses.body,
      usageCount: quickResponses.usageCount,
    })
    .from(quickResponses)
    .where(
      and(
        eq(quickResponses.isActive, true),
        or(isNull(quickResponses.area), eq(quickResponses.area, ticket.area)),
      ),
    )
    .orderBy(desc(quickResponses.usageCount), asc(quickResponses.area), asc(quickResponses.title));
}

export async function createQuickResponse(formData: FormData) {
  const user = await requireAuth();

  const parsed = quickResponseFormSchema.safeParse({
    area: formData.get('area') ?? null,
    title: formData.get('title'),
    body: formData.get('body'),
  });
  if (!parsed.success) return { error: copy.validation.invalidData };

  if (await hasActiveDuplicate(parsed.data.title, parsed.data.area)) {
    return { error: copy.quickResponses.duplicate };
  }

  await db.insert(quickResponses).values({
    area: parsed.data.area,
    title: parsed.data.title,
    body: parsed.data.body,
    createdById: user.id,
  });

  revalidateQuickResponseSurfaces();
  return { ok: true };
}

export async function updateQuickResponse(id: string, formData: FormData) {
  const user = await requireAuth();
  const parsedId = idSchema.safeParse(id);
  const parsed = quickResponseFormSchema.safeParse({
    area: formData.get('area') ?? null,
    title: formData.get('title'),
    body: formData.get('body'),
  });

  if (!parsedId.success || !parsed.success) return { error: copy.validation.invalidData };

  const [response] = await db
    .select({ createdById: quickResponses.createdById })
    .from(quickResponses)
    .where(eq(quickResponses.id, parsedId.data))
    .limit(1);
  if (!response) return { error: copy.validation.invalidQuickResponse };
  if (!canManageQuickResponse(user, response)) return { error: copy.auth.errors.permissionDenied };

  if (await hasActiveDuplicate(parsed.data.title, parsed.data.area, parsedId.data)) {
    return { error: copy.quickResponses.duplicate };
  }

  await db
    .update(quickResponses)
    .set({
      area: parsed.data.area,
      title: parsed.data.title,
      body: parsed.data.body,
      updatedAt: new Date(),
    })
    .where(eq(quickResponses.id, parsedId.data));

  revalidateQuickResponseSurfaces();
  return { ok: true };
}

export async function toggleQuickResponseActive(id: string) {
  const user = await requireAuth();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: copy.validation.invalidData };

  const [response] = await db
    .select({
      createdById: quickResponses.createdById,
      isActive: quickResponses.isActive,
      title: quickResponses.title,
      area: quickResponses.area,
    })
    .from(quickResponses)
    .where(eq(quickResponses.id, parsedId.data))
    .limit(1);
  if (!response) return { error: copy.validation.invalidQuickResponse };
  if (!canManageQuickResponse(user, response)) return { error: copy.auth.errors.permissionDenied };

  if (
    !response.isActive &&
    (await hasActiveDuplicate(response.title, response.area, parsedId.data))
  ) {
    return { error: copy.quickResponses.duplicate };
  }

  await db
    .update(quickResponses)
    .set({ isActive: !response.isActive, updatedAt: new Date() })
    .where(eq(quickResponses.id, parsedId.data));

  revalidateQuickResponseSurfaces();
  return { ok: true, nowActive: !response.isActive };
}

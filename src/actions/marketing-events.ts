'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { marketingEvents, schedules } from '@/db/schema';
import { copy } from '@/lib/copy';

const categorySchema = z.enum(['comemorativa', 'civica', 'religiosa', 'escolar', 'campanha']);

const eventSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
  category: categorySchema.default('comemorativa'),
  leadDays: z.coerce.number().int().min(0).max(180).default(7),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(100),
});

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

async function requireAdmin() {
  const user = await requireAuth();
  if (!user.isAdmin) return null;
  return user;
}

function parseFormData(formData: FormData) {
  return eventSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    month: formData.get('month'),
    day: formData.get('day'),
    category: formData.get('category') || 'comemorativa',
    leadDays: formData.get('leadDays') ?? 7,
    sortOrder: formData.get('sortOrder') ?? 100,
  });
}

export async function createMarketingEvent(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: copy.auth.errors.permissionDenied };

  const parsed = parseFormData(formData);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const data = parsed.data;
  try {
    await db.insert(marketingEvents).values({
      name: data.name,
      description: data.description || null,
      month: data.month,
      day: data.day,
      category: data.category,
      leadDays: data.leadDays,
      sortOrder: data.sortOrder,
    });
  } catch {
    return { error: copy.validation.invalidData };
  }

  revalidatePath('/marketing');
  revalidatePath('/marketing/calendario');
  return { ok: true };
}

export async function updateMarketingEvent(id: string, formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: copy.auth.errors.permissionDenied };

  const parsed = parseFormData(formData);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const data = parsed.data;
  await db
    .update(marketingEvents)
    .set({
      name: data.name,
      description: data.description || null,
      month: data.month,
      day: data.day,
      category: data.category,
      leadDays: data.leadDays,
      sortOrder: data.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(marketingEvents.id, id));

  revalidatePath('/marketing');
  revalidatePath('/marketing/calendario');
  return { ok: true };
}

export async function toggleMarketingEvent(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: copy.auth.errors.permissionDenied };

  const [existing] = await db
    .select({ id: marketingEvents.id, isActive: marketingEvents.isActive })
    .from(marketingEvents)
    .where(eq(marketingEvents.id, id))
    .limit(1);

  if (!existing) return { error: copy.validation.invalidData };

  await db
    .update(marketingEvents)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(eq(marketingEvents.id, id));

  revalidatePath('/marketing');
  revalidatePath('/marketing/calendario');
  return { ok: true, isActive: !existing.isActive };
}

export async function deleteMarketingEvent(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: copy.auth.errors.permissionDenied };

  await db.delete(marketingEvents).where(eq(marketingEvents.id, id));
  revalidatePath('/marketing');
  revalidatePath('/marketing/calendario');
  return { ok: true };
}

export async function getMarketingEvents(filters?: { activeOnly?: boolean }) {
  await requireAuth();
  const where = filters?.activeOnly ? eq(marketingEvents.isActive, true) : undefined;
  return db
    .select()
    .from(marketingEvents)
    .where(where)
    .orderBy(asc(marketingEvents.month), asc(marketingEvents.day), asc(marketingEvents.sortOrder));
}

export type UpcomingMarketingEvent = {
  id: string;
  name: string;
  description: string | null;
  category: 'comemorativa' | 'civica' | 'religiosa' | 'escolar' | 'campanha';
  leadDays: number;
  date: Date;
  daysUntil: number;
};

function nextOccurrence(month: number, day: number, ref: Date): Date {
  const candidate = new Date(ref.getFullYear(), month - 1, day);
  if (candidate < new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())) {
    return new Date(ref.getFullYear() + 1, month - 1, day);
  }
  return candidate;
}

export async function getUpcomingMarketingEvents(
  windowDays = 90,
): Promise<UpcomingMarketingEvent[]> {
  await requireAuth();

  const rows = await db
    .select()
    .from(marketingEvents)
    .where(eq(marketingEvents.isActive, true))
    .orderBy(asc(marketingEvents.month), asc(marketingEvents.day));

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const items = rows.map((r) => {
    const date = nextOccurrence(r.month, r.day, now);
    const days = Math.round((date.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      leadDays: r.leadDays,
      date,
      daysUntil: days,
    };
  });

  return items
    .filter((i) => i.daysUntil >= 0 && i.daysUntil <= windowDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export async function promoteEventToSchedule(eventId: string) {
  const user = await requireAuth();

  const [event] = await db
    .select()
    .from(marketingEvents)
    .where(eq(marketingEvents.id, eventId))
    .limit(1);

  if (!event) return { error: copy.validation.invalidData };

  const date = nextOccurrence(event.month, event.day, new Date());
  date.setHours(8, 0, 0, 0);

  await db.insert(schedules).values({
    title: event.name,
    description: event.description ?? null,
    scheduledDate: date,
    area: 'MKT',
    authorId: user.id,
  });

  revalidatePath('/agendamentos');
  revalidatePath('/marketing');
  return { ok: true };
}

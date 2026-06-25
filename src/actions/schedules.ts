'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import { schedules, users } from '@/db/schema';
import { and, asc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { copy } from '@/lib/copy';

const areaSchema = z.enum(['TI', 'MKT', 'PF']).optional();
const statusSchema = z.enum(['pendente', 'concluido', 'cancelado']);

const scheduleSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  area: z.enum(['TI', 'MKT', 'PF', '']).optional(),
  reminderMinutesBefore: z.coerce.number().int().min(0).max(1440).default(30),
  repeatReminder: z.boolean().default(true),
});

let scheduleReminderSchemaPromise: Promise<void> | null = null;

async function ensureScheduleReminderSchema() {
  scheduleReminderSchemaPromise ??= (async () => {
    await db.execute(sql`
      ALTER TABLE schedules
      ADD COLUMN IF NOT EXISTS reminder_minutes_before integer NOT NULL DEFAULT 30
    `);
    await db.execute(sql`
      ALTER TABLE schedules
      ADD COLUMN IF NOT EXISTS repeat_reminder boolean NOT NULL DEFAULT true
    `);
  })();
  return scheduleReminderSchemaPromise;
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

async function requireScheduleOwner(
  id: string,
  user: { id: string; isAdmin?: boolean },
): Promise<{ error: string } | null> {
  const [existing] = await db
    .select({ id: schedules.id, authorId: schedules.authorId })
    .from(schedules)
    .where(eq(schedules.id, id))
    .limit(1);
  if (!existing) return { error: copy.validation.invalidData };
  if (!user.isAdmin && existing.authorId !== user.id) {
    return { error: copy.auth.errors.permissionDenied };
  }
  return null;
}

function parseScheduledDate(raw: string): Date {
  return new Date(raw);
}

async function getScheduleOverlapWarning(area: 'TI' | 'MKT' | 'PF' | null, date: Date, excludeId?: string) {
  if (!area) return null;
  const start = new Date(date.getTime() - 30 * 60 * 1000);
  const end = new Date(date.getTime() + 30 * 60 * 1000);
  const conditions = [
    eq(schedules.area, area),
    ne(schedules.status, 'cancelado'),
    gte(schedules.scheduledDate, start),
    lte(schedules.scheduledDate, end),
  ];
  if (excludeId) conditions.push(ne(schedules.id, excludeId));

  const [overlap] = await db
    .select({ title: schedules.title, scheduledDate: schedules.scheduledDate })
    .from(schedules)
    .where(and(...conditions))
    .orderBy(asc(schedules.scheduledDate))
    .limit(1);

  if (!overlap) return null;
  return `Já existe "${overlap.title}" para a mesma área em horário próximo.`;
}

export async function createSchedule(formData: FormData) {
  const user = await requireAuth();
  await ensureScheduleReminderSchema();

  const parsed = scheduleSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    scheduledDate: formData.get('scheduledDate'),
    area: formData.get('area') || undefined,
    reminderMinutesBefore: formData.get('reminderMinutesBefore') || 30,
    repeatReminder: formData.has('repeatReminder'),
  });

  if (!parsed.success) return { error: copy.validation.invalidData };

  const { title, description, scheduledDate, area, reminderMinutesBefore, repeatReminder } =
    parsed.data;
  const parsedDate = parseScheduledDate(scheduledDate);
  const normalizedArea = (area as 'TI' | 'MKT' | 'PF' | undefined) || null;
  const warning = await getScheduleOverlapWarning(normalizedArea, parsedDate);

  await db.insert(schedules).values({
    title,
    description: description || null,
    scheduledDate: parsedDate,
    area: normalizedArea,
    reminderMinutesBefore,
    repeatReminder,
    authorId: user.id,
  });

  revalidatePath('/agendamentos');
  return { ok: true, warning };
}

export async function updateSchedule(id: string, formData: FormData) {
  const user = await requireAuth();
  await ensureScheduleReminderSchema();
  const denied = await requireScheduleOwner(id, user);
  if (denied) return denied;

  const parsed = scheduleSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    scheduledDate: formData.get('scheduledDate'),
    area: formData.get('area') || undefined,
    reminderMinutesBefore: formData.get('reminderMinutesBefore') || 30,
    repeatReminder: formData.has('repeatReminder'),
  });

  if (!parsed.success) return { error: copy.validation.invalidData };

  const { title, description, scheduledDate, area, reminderMinutesBefore, repeatReminder } =
    parsed.data;
  const parsedDate = parseScheduledDate(scheduledDate);
  const normalizedArea = (area as 'TI' | 'MKT' | 'PF' | undefined) || null;

  await db
    .update(schedules)
    .set({
      title,
      description: description || null,
      scheduledDate: parsedDate,
      area: normalizedArea,
      reminderMinutesBefore,
      repeatReminder,
      updatedAt: new Date(),
    })
    .where(eq(schedules.id, id));

  const warning = await getScheduleOverlapWarning(normalizedArea, parsedDate, id);
  revalidatePath('/agendamentos');
  return { ok: true, warning };
}

export async function deleteSchedule(id: string) {
  const user = await requireAuth();
  const denied = await requireScheduleOwner(id, user);
  if (denied) return denied;

  await db.delete(schedules).where(eq(schedules.id, id));

  revalidatePath('/agendamentos');
  return { ok: true };
}

export async function toggleScheduleStatus(id: string) {
  const user = await requireAuth();
  const denied = await requireScheduleOwner(id, user);
  if (denied) return denied;

  const [schedule] = await db
    .select({ id: schedules.id, status: schedules.status })
    .from(schedules)
    .where(eq(schedules.id, id))
    .limit(1);

  if (!schedule) return { error: copy.validation.invalidData };

  const newStatus = schedule.status === 'concluido' ? 'pendente' : 'concluido';

  await db
    .update(schedules)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(schedules.id, id));

  revalidatePath('/agendamentos');
  return { ok: true, status: newStatus };
}

export async function getSchedules(filters?: { area?: string; status?: string }) {
  await requireAuth();
  await ensureScheduleReminderSchema();

  const conditions = [];

  if (filters?.area && filters.area !== 'all') {
    const parsed = areaSchema.safeParse(filters.area);
    if (parsed.success && parsed.data) conditions.push(eq(schedules.area, parsed.data));
  }

  if (filters?.status && filters.status !== 'all') {
    const parsed = statusSchema.safeParse(filters.status);
    if (parsed.success) conditions.push(eq(schedules.status, parsed.data));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: schedules.id,
      title: schedules.title,
      description: schedules.description,
      scheduledDate: schedules.scheduledDate,
      area: schedules.area,
      status: schedules.status,
      reminderMinutesBefore: schedules.reminderMinutesBefore,
      repeatReminder: schedules.repeatReminder,
      authorId: schedules.authorId,
      authorName: users.displayName,
      createdAt: schedules.createdAt,
      updatedAt: schedules.updatedAt,
    })
    .from(schedules)
    .leftJoin(users, eq(schedules.authorId, users.id))
    .where(where)
    .orderBy(asc(schedules.scheduledDate), asc(schedules.createdAt));
}

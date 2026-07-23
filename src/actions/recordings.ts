'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { and, asc, eq, gte, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { recordings, users } from '@/db/schema';
import { alias } from 'drizzle-orm/pg-core';
import { copy } from '@/lib/copy';
import { requireAuth } from '@/lib/auth-helpers';
import { parseAppLocalDateTime } from '@/lib/timezone';
import { boundedInteger } from '@/lib/validation';

const statusSchema = z.enum(['planejada', 'confirmada', 'gravada', 'publicada', 'cancelada']);
const idSchema = z.string().uuid();
type RecordingStatus = z.infer<typeof statusSchema>;

const RECORDING_STATUS_TRANSITIONS: Record<RecordingStatus, RecordingStatus[]> = {
  planejada: ['confirmada', 'cancelada'],
  confirmada: ['planejada', 'gravada', 'cancelada'],
  gravada: ['publicada', 'cancelada'],
  publicada: ['gravada'],
  cancelada: ['planejada'],
};

const recordingSchema = z.object({
  title: z.string().trim().min(1).max(120),
  pauta: z.string().trim().max(2000).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().min(0).max(720).optional(),
  location: z.string().trim().max(120).optional(),
  participants: z.string().trim().max(500).optional(),
  equipment: z.string().trim().max(500).optional(),
  publishChannel: z.string().trim().max(120).optional(),
  responsibleId: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional(),
});

async function requireRecordingOwner(
  id: string,
  user: { id: string; isAdmin?: boolean },
): Promise<{ error: string } | null> {
  const [existing] = await db
    .select({ id: recordings.id, authorId: recordings.authorId, responsibleId: recordings.responsibleId })
    .from(recordings)
    .where(eq(recordings.id, id))
    .limit(1);
  if (!existing) return { error: copy.validation.invalidData };
  if (!user.isAdmin && existing.authorId !== user.id && existing.responsibleId !== user.id) {
    return { error: copy.auth.errors.permissionDenied };
  }
  return null;
}

function parseScheduledDate(raw: string): Date {
  return parseAppLocalDateTime(raw) ?? new Date(Number.NaN);
}

function parseFormData(formData: FormData) {
  return recordingSchema.safeParse({
    title: formData.get('title'),
    pauta: formData.get('pauta') || undefined,
    scheduledDate: formData.get('scheduledDate'),
    durationMinutes: formData.get('durationMinutes') || undefined,
    location: formData.get('location') || undefined,
    participants: formData.get('participants') || undefined,
    equipment: formData.get('equipment') || undefined,
    publishChannel: formData.get('publishChannel') || undefined,
    responsibleId: formData.get('responsibleId') || undefined,
    notes: formData.get('notes') || undefined,
  });
}

async function isActiveResponsible(userId: string | undefined) {
  if (!userId) return true;
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)))
    .limit(1);
  return Boolean(user);
}

export async function createRecording(formData: FormData) {
  const user = await requireAuth();
  const parsed = parseFormData(formData);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const data = parsed.data;
  if (!(await isActiveResponsible(data.responsibleId || undefined))) {
    return { error: copy.validation.ineligibleAssignee };
  }
  const scheduledDate = parseScheduledDate(data.scheduledDate);
  if (Number.isNaN(scheduledDate.getTime())) return { error: copy.validation.invalidDate };
  await db.insert(recordings).values({
    title: data.title,
    pauta: data.pauta || null,
    scheduledDate,
    durationMinutes: data.durationMinutes ?? null,
    location: data.location || null,
    participants: data.participants || null,
    equipment: data.equipment || null,
    publishChannel: data.publishChannel || null,
    responsibleId: data.responsibleId || null,
    notes: data.notes || null,
    authorId: user.id,
  });

  revalidatePath('/marketing');
  revalidatePath('/marketing/gravacoes');
  return { ok: true };
}

export async function updateRecording(id: string, formData: FormData) {
  const user = await requireAuth();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: copy.validation.invalidData };
  const denied = await requireRecordingOwner(parsedId.data, user);
  if (denied) return denied;

  const parsed = parseFormData(formData);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const data = parsed.data;
  if (!(await isActiveResponsible(data.responsibleId || undefined))) {
    return { error: copy.validation.ineligibleAssignee };
  }
  const scheduledDate = parseScheduledDate(data.scheduledDate);
  if (Number.isNaN(scheduledDate.getTime())) return { error: copy.validation.invalidDate };
  await db
    .update(recordings)
    .set({
      title: data.title,
      pauta: data.pauta || null,
      scheduledDate,
      durationMinutes: data.durationMinutes ?? null,
      location: data.location || null,
      participants: data.participants || null,
      equipment: data.equipment || null,
      publishChannel: data.publishChannel || null,
      responsibleId: data.responsibleId || null,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(recordings.id, parsedId.data));

  revalidatePath('/marketing');
  revalidatePath('/marketing/gravacoes');
  return { ok: true };
}

export async function deleteRecording(id: string) {
  const user = await requireAuth();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: copy.validation.invalidData };
  const denied = await requireRecordingOwner(parsedId.data, user);
  if (denied) return denied;

  await db.delete(recordings).where(eq(recordings.id, parsedId.data));
  revalidatePath('/marketing');
  revalidatePath('/marketing/gravacoes');
  return { ok: true };
}

export async function setRecordingStatus(id: string, status: string) {
  const user = await requireAuth();
  const parsedId = idSchema.safeParse(id);
  if (!parsedId.success) return { error: copy.validation.invalidData };
  const denied = await requireRecordingOwner(parsedId.data, user);
  if (denied) return denied;

  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { error: copy.validation.invalidData };

  const [existing] = await db
    .select({ status: recordings.status })
    .from(recordings)
    .where(eq(recordings.id, parsedId.data))
    .limit(1);
  if (!existing) return { error: copy.validation.invalidData };

  if (
    existing.status !== parsed.data &&
    !RECORDING_STATUS_TRANSITIONS[existing.status].includes(parsed.data)
  ) {
    return { error: 'Essa mudança de status não é permitida para a gravação.' };
  }

  await db
    .update(recordings)
    .set({ status: parsed.data, updatedAt: new Date() })
    .where(eq(recordings.id, parsedId.data));

  revalidatePath('/marketing');
  revalidatePath('/marketing/gravacoes');
  return { ok: true, status: parsed.data };
}

const responsibleUser = alias(users, 'recording_responsible');
const authorUser = alias(users, 'recording_author');

export async function getRecordings(filters?: { status?: string; from?: Date; to?: Date; limit?: number }) {
  await requireAuth();

  const conditions = [];
  if (filters?.status && filters.status !== 'all') {
    const parsed = statusSchema.safeParse(filters.status);
    if (parsed.success) conditions.push(eq(recordings.status, parsed.data));
  }
  if (filters?.from instanceof Date && !Number.isNaN(filters.from.getTime())) {
    conditions.push(gte(recordings.scheduledDate, filters.from));
  }
  if (filters?.to instanceof Date && !Number.isNaN(filters.to.getTime())) {
    conditions.push(lt(recordings.scheduledDate, filters.to));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = boundedInteger(filters?.limit, { min: 1, max: 300, fallback: 100 });

  return db
    .select({
      id: recordings.id,
      title: recordings.title,
      pauta: recordings.pauta,
      scheduledDate: recordings.scheduledDate,
      durationMinutes: recordings.durationMinutes,
      location: recordings.location,
      participants: recordings.participants,
      equipment: recordings.equipment,
      publishChannel: recordings.publishChannel,
      status: recordings.status,
      notes: recordings.notes,
      responsibleId: recordings.responsibleId,
      responsibleName: responsibleUser.displayName,
      authorId: recordings.authorId,
      authorName: authorUser.displayName,
      createdAt: recordings.createdAt,
      updatedAt: recordings.updatedAt,
    })
    .from(recordings)
    .leftJoin(responsibleUser, eq(recordings.responsibleId, responsibleUser.id))
    .leftJoin(authorUser, eq(recordings.authorId, authorUser.id))
    .where(where)
    .orderBy(asc(recordings.scheduledDate), asc(recordings.createdAt))
    .limit(limit);
}

export async function getRecordingStats() {
  await requireAuth();

  const now = new Date();
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

  const [row] = await db
    .select({
      planejadas: sql<number>`count(*) filter (where ${recordings.status} in ('planejada', 'confirmada'))`,
      semana: sql<number>`count(*) filter (where ${recordings.scheduledDate} >= ${now} and ${recordings.scheduledDate} < ${weekEnd} and ${recordings.status} in ('planejada', 'confirmada'))`,
      gravadas: sql<number>`count(*) filter (where ${recordings.status} = 'gravada')`,
    })
    .from(recordings);

  return {
    planejadas: Number(row?.planejadas ?? 0),
    semana: Number(row?.semana ?? 0),
    gravadas: Number(row?.gravadas ?? 0),
  };
}

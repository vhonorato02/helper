'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, asc, eq, gte, inArray, lt, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db } from '@/db';
import { chromebookBookings, chromebookSettings, users } from '@/db/schema';
import { copy } from '@/lib/copy';
import {
  ACTIVE_CHROMEBOOK_BOOKING_STATUSES,
  CHROMEBOOK_SETTINGS_ID,
  DEFAULT_CHROMEBOOK_TOTAL,
  calculateMaxChromebooksUsed,
  combineDateTimeInSaoPaulo,
  dateInputInSaoPaulo,
  findRoomConflict,
  formatChromebookPeriod,
  isActiveChromebookBookingStatus,
  validateChromebookHolidayPolicy,
  type ChromebookBookingStatus,
} from '@/lib/chromebooks';
import { buildSimpleEmail, sendGenericEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const statusSchema = z.enum(['pendente', 'confirmado', 'cancelado']);
const MIN_BOOKING_DURATION_MS = 15 * 60 * 1000;
const MAX_BOOKING_DURATION_MS = 8 * 60 * 60 * 1000;
const MIN_BOOKING_LEAD_MS = 60 * 60 * 1000;
const PAST_TOLERANCE_MS = 15 * 60 * 1000;
const PUBLIC_LIMIT = { limit: 5, windowMs: 60_000, lockoutMs: 5 * 60_000 };
const LOCK_ID = 'chromebook-bookings';

const bookingSchema = z.object({
  date: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  room: z.string().trim().min(1).max(80),
  quantity: z.coerce.number().int().min(1).max(500),
  requesterName: z.string().trim().min(1).max(120),
  requesterContact: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
  status: statusSchema.optional(),
});

type BookingInput = z.infer<typeof bookingSchema>;

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

function normalizeOptionalText(value: string | undefined) {
  return value && value.length > 0 ? value : null;
}

function parseBookingForm(formData: FormData, fallbackRequesterName?: string) {
  return bookingSchema.safeParse({
    date: formData.get('date'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    room: formData.get('room'),
    quantity: formData.get('quantity'),
    requesterName: formData.get('requesterName') || fallbackRequesterName,
    requesterContact: formData.get('requesterContact') || undefined,
    notes: formData.get('notes') || undefined,
    status: formData.get('status') || undefined,
  });
}

function publicHoneypotFilled(formData: FormData) {
  return String(formData.get('website') ?? '').trim().length > 0;
}

async function getClientIp() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    requestHeaders.get('x-real-ip') ||
    'unknown'
  );
}

function fakeProtocol(prefix = 'CHR') {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function isEmail(value: string | null | undefined) {
  return !!value && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && !/[\r\n]/.test(value);
}

async function ensureChromebookSettings() {
  await db
    .insert(chromebookSettings)
    .values({ id: CHROMEBOOK_SETTINGS_ID, totalChromebooks: DEFAULT_CHROMEBOOK_TOTAL })
    .onConflictDoNothing();
}

export async function getChromebookSettings() {
  await ensureChromebookSettings();
  const [settings] = await db
    .select()
    .from(chromebookSettings)
    .where(eq(chromebookSettings.id, CHROMEBOOK_SETTINGS_ID))
    .limit(1);

  return {
    id: settings?.id ?? CHROMEBOOK_SETTINGS_ID,
    totalChromebooks: settings?.totalChromebooks ?? DEFAULT_CHROMEBOOK_TOTAL,
    updatedAt: settings?.updatedAt ?? new Date(),
  };
}

function parseBookingPeriod(input: BookingInput) {
  const startAt = combineDateTimeInSaoPaulo(input.date, input.startTime);
  const endAt = combineDateTimeInSaoPaulo(input.date, input.endTime);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    return { error: 'Informe um horário de início e término válido.' } as const;
  }

  const duration = endAt.getTime() - startAt.getTime();
  if (duration < MIN_BOOKING_DURATION_MS) {
    return { error: 'A reserva precisa ter pelo menos 15 minutos.' } as const;
  }
  if (duration > MAX_BOOKING_DURATION_MS) {
    return { error: 'A reserva pode ter no máximo 8 horas.' } as const;
  }

  const now = Date.now();
  if (startAt.getTime() < now - PAST_TOLERANCE_MS) {
    return { error: 'Não é possível reservar Chromebooks para um horário que já passou.' } as const;
  }
  if (startAt.getTime() < now + MIN_BOOKING_LEAD_MS) {
    return { error: 'Solicite a reserva com pelo menos 1 hora de antecedência.' } as const;
  }

  return { startAt, endAt } as const;
}

async function getOverlappingActiveBookings(startAt: Date, endAt: Date, excludeId?: string) {
  const conditions = [
    lt(chromebookBookings.startAt, endAt),
    sql`${chromebookBookings.endAt} > ${startAt}`,
    inArray(chromebookBookings.status, [...ACTIVE_CHROMEBOOK_BOOKING_STATUSES]),
  ];

  if (excludeId) conditions.push(ne(chromebookBookings.id, excludeId));

  return db
    .select({
      id: chromebookBookings.id,
      startAt: chromebookBookings.startAt,
      endAt: chromebookBookings.endAt,
      quantity: chromebookBookings.quantity,
      room: chromebookBookings.room,
      status: chromebookBookings.status,
    })
    .from(chromebookBookings)
    .where(and(...conditions));
}

async function validateBookingAvailability(input: BookingInput, excludeId?: string) {
  const period = parseBookingPeriod(input);
  if ('error' in period) return { error: period.error } as const;

  const holidayPolicy = validateChromebookHolidayPolicy(input.date, input.startTime);
  if (!holidayPolicy.ok) return { error: holidayPolicy.reason } as const;

  const settings = await getChromebookSettings();
  if (input.quantity > settings.totalChromebooks) {
    return {
      error: `A quantidade solicitada ultrapassa o total configurado de ${settings.totalChromebooks} Chromebook(s).`,
    } as const;
  }

  const requestedStatus = input.status ?? 'pendente';
  if (!isActiveChromebookBookingStatus(requestedStatus)) {
    return {
      period,
      maxUsed: 0,
      available: settings.totalChromebooks,
      total: settings.totalChromebooks,
    } as const;
  }

  const overlapping = await getOverlappingActiveBookings(period.startAt, period.endAt, excludeId);

  const roomConflict = findRoomConflict(input.room, period.startAt, period.endAt, overlapping);
  if (roomConflict) {
    return {
      error: `A sala ${input.room} já tem um agendamento nesse intervalo.`,
    } as const;
  }

  const maxUsed = calculateMaxChromebooksUsed(period.startAt, period.endAt, overlapping);
  const available = settings.totalChromebooks - maxUsed;
  if (input.quantity > available) {
    return {
      error: `Há apenas ${Math.max(0, available)} Chromebook(s) disponível(is) nesse intervalo.`,
    } as const;
  }

  return { period, maxUsed, available, total: settings.totalChromebooks } as const;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    String(error.message).toLowerCase().includes('unique')
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let lockTablePromise: Promise<void> | null = null;

async function ensureChromebookLockTable() {
  lockTablePromise ??= (async () => {
    await db.execute(sql`ALTER TABLE chromebook_bookings ADD COLUMN IF NOT EXISTS requester_contact text`);
    await db.execute(sql`ALTER TABLE chromebook_bookings ADD COLUMN IF NOT EXISTS protocol text`);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS chromebook_bookings_protocol_idx
      ON chromebook_bookings (protocol) WHERE protocol IS NOT NULL
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS chromebook_booking_locks (
        id text PRIMARY KEY,
        owner text NOT NULL,
        expires_at timestamp NOT NULL
      )
    `);
  })();
  return lockTablePromise;
}

async function withChromebookBookingLock<T>(callback: () => Promise<T>) {
  await ensureChromebookLockTable();
  const owner = crypto.randomUUID();
  const deadline = Date.now() + 5_000;

  while (Date.now() < deadline) {
    await db.execute(sql`DELETE FROM chromebook_booking_locks WHERE id = ${LOCK_ID} AND expires_at < now()`);
    try {
      await db.execute(sql`
        INSERT INTO chromebook_booking_locks (id, owner, expires_at)
        VALUES (${LOCK_ID}, ${owner}, now() + interval '10 seconds')
      `);
      try {
        return await callback();
      } finally {
        await db.execute(sql`
          DELETE FROM chromebook_booking_locks
          WHERE id = ${LOCK_ID} AND owner = ${owner}
        `);
      }
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      await sleep(120);
    }
  }

  return { error: 'Outra reserva está sendo processada agora. Tente novamente em alguns segundos.' } as T;
}

function createChromebookProtocol() {
  return fakeProtocol('CHR');
}

async function saveBooking(input: BookingInput, options: { id?: string; responsibleId?: string | null }) {
  return withChromebookBookingLock(async () => {
    const availability = await validateBookingAvailability(input, options.id);
    if ('error' in availability) return { error: availability.error };

    const values = {
      startAt: availability.period.startAt,
      endAt: availability.period.endAt,
      quantity: input.quantity,
      room: input.room,
      requesterName: input.requesterName,
      requesterContact: normalizeOptionalText(input.requesterContact),
      notes: normalizeOptionalText(input.notes),
      status: (input.status ?? 'pendente') as ChromebookBookingStatus,
      responsibleId: options.responsibleId ?? null,
      updatedAt: new Date(),
    };

    if (options.id) {
      const [existing] = await db
        .select({ id: chromebookBookings.id })
        .from(chromebookBookings)
        .where(eq(chromebookBookings.id, options.id))
        .limit(1);
      if (!existing) return { error: 'Agendamento não encontrado.' };

      await db.update(chromebookBookings).set(values).where(eq(chromebookBookings.id, options.id));
    } else {
      const protocol = createChromebookProtocol();
      await db.insert(chromebookBookings).values({ ...values, protocol });

      revalidatePath('/chromebooks');
      revalidatePath('/chromebooks/solicitar');
      revalidatePath('/solicitar/chromebooks');
      return { ok: true, protocol };
    }

    revalidatePath('/chromebooks');
    revalidatePath('/chromebooks/solicitar');
    revalidatePath('/solicitar/chromebooks');
    return { ok: true };
  });
}

export async function createPublicChromebookBooking(formData: FormData) {
  if (publicHoneypotFilled(formData)) {
    return { ok: true, protocol: fakeProtocol() };
  }

  const ip = await getClientIp();
  const rate = checkRateLimit({ key: `public-chromebook:${ip}`, ...PUBLIC_LIMIT });
  if (!rate.ok) return { error: copy.validation.rateLimited };

  const parsed = parseBookingForm(formData);
  if (!parsed.success) return { error: copy.validation.invalidData };
  const result = await saveBooking(parsed.data, { responsibleId: null });

  if ('protocol' in result && isEmail(parsed.data.requesterContact)) {
    const { html, text } = buildSimpleEmail({
      title: `Solicitação ${result.protocol} recebida`,
      intro: 'Recebemos sua solicitação de reserva de Chromebooks.',
      items: [
        {
          heading: 'Resumo',
          lines: [
            `Data: ${parsed.data.date}`,
            `Horário: ${parsed.data.startTime} às ${parsed.data.endTime}`,
            `Sala: ${parsed.data.room}`,
            `Quantidade: ${parsed.data.quantity}`,
          ],
        },
      ],
    });
    await sendGenericEmail({
      to: [parsed.data.requesterContact!],
      subject: `[Helper] Solicitação ${result.protocol} recebida`,
      html,
      text,
      tag: 'public_chromebook_confirmation',
    });
  }

  return result;
}

export async function createChromebookBooking(formData: FormData) {
  const user = await requireAuth();
  const parsed = parseBookingForm(formData, user.name ?? user.username);
  if (!parsed.success) return { error: copy.validation.invalidData };
  return saveBooking(parsed.data, { responsibleId: user.id });
}

export async function updateChromebookBooking(id: string, formData: FormData) {
  const user = await requireAuth();
  const parsed = parseBookingForm(formData, user.name ?? user.username);
  if (!parsed.success) return { error: copy.validation.invalidData };
  return saveBooking(parsed.data, { id, responsibleId: user.id });
}

export async function cancelChromebookBooking(id: string) {
  await requireAuth();
  const [existing] = await db
    .select({ id: chromebookBookings.id })
    .from(chromebookBookings)
    .where(eq(chromebookBookings.id, id))
    .limit(1);
  if (!existing) return { error: 'Agendamento não encontrado.' };

  await db
    .update(chromebookBookings)
    .set({ status: 'cancelado', updatedAt: new Date() })
    .where(eq(chromebookBookings.id, id));

  revalidatePath('/chromebooks');
  revalidatePath('/chromebooks/solicitar');
  revalidatePath('/solicitar/chromebooks');
  return { ok: true };
}

export async function confirmChromebookBooking(id: string) {
  const user = await requireAuth();
  return withChromebookBookingLock(async () => {
    const [existing] = await db
      .select({
        id: chromebookBookings.id,
        startAt: chromebookBookings.startAt,
        endAt: chromebookBookings.endAt,
        quantity: chromebookBookings.quantity,
        room: chromebookBookings.room,
        requesterName: chromebookBookings.requesterName,
        requesterContact: chromebookBookings.requesterContact,
        notes: chromebookBookings.notes,
        status: chromebookBookings.status,
      })
      .from(chromebookBookings)
      .where(eq(chromebookBookings.id, id))
      .limit(1);
    if (!existing) return { error: 'Agendamento não encontrado.' };
    if (existing.status === 'confirmado') return { ok: true };
    if (existing.status === 'cancelado') {
      return { error: 'Agendamentos cancelados não podem ser aprovados diretamente.' };
    }

    const settings = await getChromebookSettings();
    if (existing.quantity > settings.totalChromebooks) {
      return {
        error: `A quantidade solicitada ultrapassa o total configurado de ${settings.totalChromebooks} Chromebook(s).`,
      };
    }

    const overlapping = await getOverlappingActiveBookings(existing.startAt, existing.endAt, existing.id);
    const roomConflict = findRoomConflict(existing.room, existing.startAt, existing.endAt, overlapping);
    if (roomConflict) {
      return { error: `A sala ${existing.room} já tem um agendamento nesse intervalo.` };
    }

    const maxUsed = calculateMaxChromebooksUsed(existing.startAt, existing.endAt, overlapping);
    if (maxUsed + existing.quantity > settings.totalChromebooks) {
      const available = Math.max(0, settings.totalChromebooks - maxUsed);
      return { error: `Há apenas ${available} Chromebook(s) disponível(is) nesse intervalo.` };
    }

    await db
      .update(chromebookBookings)
      .set({ status: 'confirmado', responsibleId: user.id, updatedAt: new Date() })
      .where(eq(chromebookBookings.id, id));

    revalidatePath('/chromebooks');
    revalidatePath('/chromebooks/solicitar');
    revalidatePath('/solicitar/chromebooks');
    return { ok: true };
  });
}

export async function deleteChromebookBooking(id: string) {
  const user = await requireAdmin();
  if (!user) return { error: copy.auth.errors.permissionDenied };

  await db.delete(chromebookBookings).where(eq(chromebookBookings.id, id));
  revalidatePath('/chromebooks');
  revalidatePath('/chromebooks/solicitar');
  revalidatePath('/solicitar/chromebooks');
  return { ok: true };
}

function calculatePeakUsage(
  bookings: Array<{ startAt: Date; endAt: Date; quantity: number }>,
) {
  const points = new Set<number>();
  for (const booking of bookings) {
    points.add(booking.startAt.getTime());
    points.add(booking.endAt.getTime());
  }
  const ordered = Array.from(points).sort((a, b) => a - b);
  let peak = 0;

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const start = new Date(ordered[index]);
    const end = new Date(ordered[index + 1]);
    const used = bookings.reduce(
      (total, booking) =>
        booking.startAt < end && booking.endAt > start ? total + booking.quantity : total,
      0,
    );
    peak = Math.max(peak, used);
  }

  return peak;
}

function findPeakUsageWindow(
  bookings: Array<{ startAt: Date; endAt: Date; quantity: number; room?: string }>,
) {
  const points = new Set<number>();
  for (const booking of bookings) {
    points.add(booking.startAt.getTime());
    points.add(booking.endAt.getTime());
  }
  const ordered = Array.from(points).sort((a, b) => a - b);
  let best:
    | {
        peak: number;
        start: Date;
        end: Date;
        rooms: string[];
      }
    | null = null;

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const start = new Date(ordered[index]);
    const end = new Date(ordered[index + 1]);
    const active = bookings.filter((booking) => booking.startAt < end && booking.endAt > start);
    const peak = active.reduce((total, booking) => total + booking.quantity, 0);
    if (!best || peak > best.peak) {
      best = {
        peak,
        start,
        end,
        rooms: active.map((booking) => booking.room).filter((room): room is string => Boolean(room)),
      };
    }
  }

  return best;
}

export async function updateChromebookSettings(formData: FormData) {
  const user = await requireAdmin();
  if (!user) return { error: copy.auth.errors.permissionDenied };

  const parsed = z.coerce.number().int().min(1).max(500).safeParse(formData.get('totalChromebooks'));
  if (!parsed.success) return { error: copy.validation.invalidData };

  await ensureChromebookSettings();

  const activeBookings = await db
    .select({
      startAt: chromebookBookings.startAt,
      endAt: chromebookBookings.endAt,
      quantity: chromebookBookings.quantity,
      room: chromebookBookings.room,
    })
    .from(chromebookBookings)
    .where(inArray(chromebookBookings.status, [...ACTIVE_CHROMEBOOK_BOOKING_STATUSES]));
  const peakWindow = findPeakUsageWindow(activeBookings);
  const peak = peakWindow?.peak ?? calculatePeakUsage(activeBookings);

  if (parsed.data < peak) {
    const detail = peakWindow
      ? ` Pico atual: ${formatChromebookPeriod(peakWindow.start, peakWindow.end)}${peakWindow.rooms.length > 0 ? ` (${peakWindow.rooms.slice(0, 3).join(', ')})` : ''}.`
      : '';
    return {
      error: `O total não pode ficar abaixo de ${peak}, pois já existe reserva ativa nesse pico.${detail}`,
    };
  }

  await db
    .update(chromebookSettings)
    .set({ totalChromebooks: parsed.data, updatedAt: new Date() })
    .where(eq(chromebookSettings.id, CHROMEBOOK_SETTINGS_ID));

  revalidatePath('/chromebooks');
  revalidatePath('/chromebooks/solicitar');
  return { ok: true };
}

export async function getChromebookBookings(filters?: {
  date?: string;
  status?: string;
  room?: string;
  quantity?: string;
}) {
  await requireAuth();
  await ensureChromebookLockTable();

  const conditions = [];
  const parsedDate = filters?.date ? dateSchema.safeParse(filters.date) : null;
  if (parsedDate?.success) {
    const dayStart = combineDateTimeInSaoPaulo(parsedDate.data, '00:00');
    const dayEnd = combineDateTimeInSaoPaulo(parsedDate.data, '23:59');
    conditions.push(gte(chromebookBookings.startAt, dayStart), lt(chromebookBookings.startAt, dayEnd));
  }

  if (filters?.status && filters.status !== 'all') {
    const parsedStatus = statusSchema.safeParse(filters.status);
    if (parsedStatus.success) conditions.push(eq(chromebookBookings.status, parsedStatus.data));
  }

  if (filters?.room?.trim()) {
    conditions.push(sql`lower(${chromebookBookings.room}) like ${`%${filters.room.trim().toLocaleLowerCase('pt-BR')}%`}`);
  }

  const parsedQuantity = z.coerce.number().int().min(1).safeParse(filters?.quantity);
  if (parsedQuantity.success) {
    conditions.push(gte(chromebookBookings.quantity, parsedQuantity.data));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: chromebookBookings.id,
      startAt: chromebookBookings.startAt,
      endAt: chromebookBookings.endAt,
      quantity: chromebookBookings.quantity,
      room: chromebookBookings.room,
      requesterName: chromebookBookings.requesterName,
      requesterContact: chromebookBookings.requesterContact,
      protocol: chromebookBookings.protocol,
      notes: chromebookBookings.notes,
      status: chromebookBookings.status,
      responsibleId: chromebookBookings.responsibleId,
      responsibleName: users.displayName,
      createdAt: chromebookBookings.createdAt,
      updatedAt: chromebookBookings.updatedAt,
    })
    .from(chromebookBookings)
    .leftJoin(users, eq(chromebookBookings.responsibleId, users.id))
    .where(where)
    .orderBy(asc(chromebookBookings.startAt), asc(chromebookBookings.room));
}

export async function getChromebookDaySummary(date?: string) {
  const settings = await getChromebookSettings();
  const targetDate = date ?? dateInputInSaoPaulo(new Date());
  const dayStart = combineDateTimeInSaoPaulo(targetDate, '00:00');
  const dayEnd = combineDateTimeInSaoPaulo(targetDate, '23:59');
  const active = await getOverlappingActiveBookings(dayStart, dayEnd);
  const used = calculateMaxChromebooksUsed(dayStart, dayEnd, active);

  return {
    date: targetDate,
    total: settings.totalChromebooks,
    reservedPeak: used,
    availableAtPeak: Math.max(0, settings.totalChromebooks - used),
    activeBookings: active.length,
  };
}

export type ChromebookBookingRow = Awaited<ReturnType<typeof getChromebookBookings>>[number];

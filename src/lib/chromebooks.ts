import { getHolidayByDate, isFullNonWorkingHoliday, isPartialHoliday } from '@/lib/holidays';
import { isValidDateInput, isValidTimeInput, parseAppLocalDateTime } from '@/lib/timezone';

export const DEFAULT_CHROMEBOOK_TOTAL = 30;
export const CHROMEBOOK_SETTINGS_ID = 'default';
export const ACTIVE_CHROMEBOOK_BOOKING_STATUSES = ['pendente', 'confirmado'] as const;

export type ChromebookBookingStatus = 'pendente' | 'confirmado' | 'cancelado';

export function isActiveChromebookBookingStatus(status: ChromebookBookingStatus) {
  return ACTIVE_CHROMEBOOK_BOOKING_STATUSES.includes(
    status as (typeof ACTIVE_CHROMEBOOK_BOOKING_STATUSES)[number],
  );
}

export const CHROMEBOOK_STATUS_LABELS: Record<ChromebookBookingStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
};

export function requestedChromebookBookingStatus(
  status: string | null | undefined,
  options: { allowExplicitStatus: boolean },
) {
  if (!options.allowExplicitStatus) return 'pendente';
  return status || undefined;
}

export type BookingInterval = {
  id?: string;
  startAt: Date;
  endAt: Date;
  quantity: number;
};

export function minutesFromTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function combineDateTimeInSaoPaulo(date: string, time: string) {
  if (!isValidDateInput(date) || !isValidTimeInput(time)) return new Date(Number.NaN);
  return parseAppLocalDateTime(`${date}T${time}`) ?? new Date(Number.NaN);
}

export function dateInputInSaoPaulo(value: Date | string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function timeInputInSaoPaulo(value: Date | string) {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.hour}:${map.minute}`;
}

export function formatChromebookPeriod(startAt: Date | string, endAt: Date | string) {
  const day = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(startAt));
  return `${day}, ${timeInputInSaoPaulo(startAt)}-${timeInputInSaoPaulo(endAt)}`;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

export function calculateMaxChromebooksUsed(
  requestedStart: Date,
  requestedEnd: Date,
  bookings: BookingInterval[],
) {
  const points = new Set<number>([requestedStart.getTime(), requestedEnd.getTime()]);

  for (const booking of bookings) {
    if (!overlaps(requestedStart, requestedEnd, booking.startAt, booking.endAt)) continue;
    points.add(Math.max(requestedStart.getTime(), booking.startAt.getTime()));
    points.add(Math.min(requestedEnd.getTime(), booking.endAt.getTime()));
  }

  const ordered = Array.from(points).sort((a, b) => a - b);
  let maxUsed = 0;

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const segmentStart = new Date(ordered[index]);
    const segmentEnd = new Date(ordered[index + 1]);
    if (segmentStart.getTime() === segmentEnd.getTime()) continue;

    const used = bookings.reduce((total, booking) => {
      return overlaps(segmentStart, segmentEnd, booking.startAt, booking.endAt)
        ? total + booking.quantity
        : total;
    }, 0);
    maxUsed = Math.max(maxUsed, used);
  }

  return maxUsed;
}

export function findRoomConflict(
  room: string,
  requestedStart: Date,
  requestedEnd: Date,
  bookings: Array<BookingInterval & { room: string }>,
) {
  const normalizedRoom = room.trim().toLocaleLowerCase('pt-BR');
  return (
    bookings.find(
      (booking) =>
        booking.room.trim().toLocaleLowerCase('pt-BR') === normalizedRoom &&
        overlaps(requestedStart, requestedEnd, booking.startAt, booking.endAt),
    ) ?? null
  );
}

export function validateChromebookHolidayPolicy(date: string, startTime: string) {
  const holiday = getHolidayByDate(date);
  if (!holiday) return { ok: true as const };

  if (isFullNonWorkingHoliday(holiday)) {
    return {
      ok: false as const,
      reason: `${holiday.name} é dia sem expediente para agendamento de Chromebooks.`,
    };
  }

  if (isPartialHoliday(holiday)) {
    const partialStart = holiday.partialStartTime ?? '13:00';
    if (minutesFromTime(startTime) < minutesFromTime(partialStart)) {
      return {
        ok: false as const,
        reason: `Em ${holiday.name}, os agendamentos devem começar a partir de ${partialStart}.`,
      };
    }
  }

  return { ok: true as const };
}

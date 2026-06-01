const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;
const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo';

export type PublicRequestScheduleInput = {
  desiredDate?: string;
  startTime?: string;
  endTime?: string;
};

export function validatePublicContact(
  value: string | null | undefined,
): { ok: true; contact: string } | { ok: false; error: string } {
  const contact = value?.trim() ?? '';
  if (contact.length < 3) {
    return { ok: false, error: 'Informe um e-mail ou telefone para contato.' };
  }
  if (/[\r\n]/.test(contact)) {
    return { ok: false, error: 'Informe um contato válido.' };
  }
  return { ok: true, contact };
}

function dateInputInTimeZone(date: Date, timeZone = SAO_PAULO_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string) {
  const match = DATE_RE.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return value;
}

function parseTimeInput(value: string) {
  const match = TIME_RE.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function validatePublicRequestSchedule(
  input: PublicRequestScheduleInput,
  options: { required?: boolean; now?: Date } = {},
): { ok: true } | { ok: false; error: string } {
  const desiredDate = input.desiredDate?.trim() ?? '';
  const startTime = input.startTime?.trim() ?? '';
  const endTime = input.endTime?.trim() ?? '';
  const hasAnyScheduleField = Boolean(desiredDate || startTime || endTime);

  if (!hasAnyScheduleField && !options.required) return { ok: true };

  if (!desiredDate || !startTime || !endTime) {
    return {
      ok: false,
      error: 'Informe data, início e término para agendar a solicitação.',
    };
  }

  const parsedDate = parseDateInput(desiredDate);
  if (!parsedDate) {
    return { ok: false, error: 'Informe uma data válida.' };
  }

  const today = dateInputInTimeZone(options.now ?? new Date());
  if (parsedDate < today) {
    return { ok: false, error: 'Escolha uma data de hoje em diante.' };
  }

  const startMinutes = parseTimeInput(startTime);
  const endMinutes = parseTimeInput(endTime);
  if (startMinutes === null || endMinutes === null) {
    return { ok: false, error: 'Informe horários válidos.' };
  }

  if (endMinutes <= startMinutes) {
    return { ok: false, error: 'O horário de término precisa ser maior que o início.' };
  }

  return { ok: true };
}

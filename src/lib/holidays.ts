export type HolidayKind =
  | 'national_holiday'
  | 'state_holiday'
  | 'municipal_holiday'
  | 'optional'
  | 'partial_optional';

export type InstitutionalHoliday = {
  date: string;
  name: string;
  kinds: HolidayKind[];
  weekday: string;
  note?: string;
  partialStartTime?: string;
};

export const HOLIDAY_KIND_LABELS: Record<HolidayKind, string> = {
  national_holiday: 'Feriado nacional',
  state_holiday: 'Feriado estadual',
  municipal_holiday: 'Feriado municipal',
  optional: 'Ponto facultativo',
  partial_optional: 'Ponto facultativo parcial',
};

export const HOLIDAY_KIND_SHORT_LABELS: Record<HolidayKind, string> = {
  national_holiday: 'Nacional',
  state_holiday: 'Estadual',
  municipal_holiday: 'Municipal',
  optional: 'Facultativo',
  partial_optional: 'Parcial',
};

export const PINDAMONHANGABA_HOLIDAYS_2026: InstitutionalHoliday[] = [
  {
    date: '2026-02-16',
    weekday: 'segunda-feira',
    name: 'Ponto Facultativo',
    kinds: ['optional'],
  },
  {
    date: '2026-02-17',
    weekday: 'terça-feira',
    name: 'Carnaval',
    kinds: ['optional'],
  },
  {
    date: '2026-02-18',
    weekday: 'quarta-feira',
    name: 'Ponto Facultativo Parcial',
    kinds: ['partial_optional'],
    partialStartTime: '13:00',
    note: 'Expediente normal a partir do segundo período da jornada.',
  },
  {
    date: '2026-04-03',
    weekday: 'sexta-feira',
    name: 'Dia da Paixão de Cristo',
    kinds: ['national_holiday', 'municipal_holiday'],
  },
  {
    date: '2026-04-06',
    weekday: 'segunda-feira',
    name: 'Dia de São Benedito',
    kinds: ['municipal_holiday'],
  },
  {
    date: '2026-04-20',
    weekday: 'segunda-feira',
    name: 'Ponto Facultativo',
    kinds: ['optional'],
  },
  {
    date: '2026-04-21',
    weekday: 'terça-feira',
    name: 'Tiradentes',
    kinds: ['national_holiday'],
  },
  {
    date: '2026-05-01',
    weekday: 'sexta-feira',
    name: 'Dia do Trabalho',
    kinds: ['national_holiday'],
  },
  {
    date: '2026-06-04',
    weekday: 'quinta-feira',
    name: 'Corpus Christi',
    kinds: ['municipal_holiday'],
  },
  {
    date: '2026-06-05',
    weekday: 'sexta-feira',
    name: 'Ponto Facultativo',
    kinds: ['optional'],
  },
  {
    date: '2026-07-09',
    weekday: 'quinta-feira',
    name: 'Dia da Revolução Constitucionalista',
    kinds: ['state_holiday'],
  },
  {
    date: '2026-07-10',
    weekday: 'sexta-feira',
    name: 'Emancipação Política da Cidade',
    kinds: ['optional'],
  },
  {
    date: '2026-09-07',
    weekday: 'segunda-feira',
    name: 'Independência do Brasil',
    kinds: ['national_holiday'],
  },
  {
    date: '2026-09-08',
    weekday: 'terça-feira',
    name: 'Nossa Senhora do Bom Sucesso',
    kinds: ['municipal_holiday'],
  },
  {
    date: '2026-10-12',
    weekday: 'segunda-feira',
    name: 'Nossa Senhora Aparecida',
    kinds: ['national_holiday'],
  },
  {
    date: '2026-10-28',
    weekday: 'quarta-feira',
    name: 'Dia do Servidor Público',
    kinds: ['optional'],
  },
  {
    date: '2026-11-02',
    weekday: 'segunda-feira',
    name: 'Finados',
    kinds: ['national_holiday'],
  },
  {
    date: '2026-11-15',
    weekday: 'domingo',
    name: 'Proclamação da República',
    kinds: ['national_holiday'],
  },
  {
    date: '2026-11-20',
    weekday: 'sexta-feira',
    name: 'Dia Nacional de Zumbi e da Consciência Negra',
    kinds: ['national_holiday'],
  },
  {
    date: '2026-12-24',
    weekday: 'quinta-feira',
    name: 'Ponto Facultativo',
    kinds: ['optional'],
  },
  {
    date: '2026-12-25',
    weekday: 'sexta-feira',
    name: 'Natal',
    kinds: ['national_holiday'],
  },
  {
    date: '2026-12-31',
    weekday: 'quinta-feira',
    name: 'Ponto Facultativo',
    kinds: ['optional'],
  },
] as const;

export const PINDAMONHANGABA_HOLIDAYS_2027: InstitutionalHoliday[] = [
  { date: '2027-01-01', weekday: 'sexta-feira', name: 'Confraternização Universal', kinds: ['national_holiday'] },
  { date: '2027-02-08', weekday: 'segunda-feira', name: 'Ponto Facultativo', kinds: ['optional'] },
  { date: '2027-02-09', weekday: 'terça-feira', name: 'Carnaval', kinds: ['optional'] },
  {
    date: '2027-02-10',
    weekday: 'quarta-feira',
    name: 'Ponto Facultativo Parcial',
    kinds: ['partial_optional'],
    partialStartTime: '13:00',
    note: 'Expediente normal a partir do segundo período da jornada.',
  },
  {
    date: '2027-03-26',
    weekday: 'sexta-feira',
    name: 'Dia da Paixão de Cristo',
    kinds: ['national_holiday', 'municipal_holiday'],
  },
  { date: '2027-04-06', weekday: 'terça-feira', name: 'Dia de São Benedito', kinds: ['municipal_holiday'] },
  { date: '2027-04-21', weekday: 'quarta-feira', name: 'Tiradentes', kinds: ['national_holiday'] },
  { date: '2027-05-01', weekday: 'sábado', name: 'Dia do Trabalho', kinds: ['national_holiday'] },
  { date: '2027-05-27', weekday: 'quinta-feira', name: 'Corpus Christi', kinds: ['municipal_holiday'] },
  { date: '2027-05-28', weekday: 'sexta-feira', name: 'Ponto Facultativo', kinds: ['optional'] },
  {
    date: '2027-07-09',
    weekday: 'sexta-feira',
    name: 'Dia da Revolução Constitucionalista',
    kinds: ['state_holiday'],
  },
  { date: '2027-07-10', weekday: 'sábado', name: 'Emancipação Política da Cidade', kinds: ['optional'] },
  { date: '2027-09-06', weekday: 'segunda-feira', name: 'Ponto Facultativo', kinds: ['optional'] },
  { date: '2027-09-07', weekday: 'terça-feira', name: 'Independência do Brasil', kinds: ['national_holiday'] },
  {
    date: '2027-09-08',
    weekday: 'quarta-feira',
    name: 'Nossa Senhora do Bom Sucesso',
    kinds: ['municipal_holiday'],
  },
  { date: '2027-10-12', weekday: 'terça-feira', name: 'Nossa Senhora Aparecida', kinds: ['national_holiday'] },
  { date: '2027-10-28', weekday: 'quinta-feira', name: 'Dia do Servidor Público', kinds: ['optional'] },
  { date: '2027-11-01', weekday: 'segunda-feira', name: 'Ponto Facultativo', kinds: ['optional'] },
  { date: '2027-11-02', weekday: 'terça-feira', name: 'Finados', kinds: ['national_holiday'] },
  { date: '2027-11-15', weekday: 'segunda-feira', name: 'Proclamação da República', kinds: ['national_holiday'] },
  {
    date: '2027-11-20',
    weekday: 'sábado',
    name: 'Dia Nacional de Zumbi e da Consciência Negra',
    kinds: ['national_holiday'],
  },
  { date: '2027-12-24', weekday: 'sexta-feira', name: 'Ponto Facultativo', kinds: ['optional'] },
  { date: '2027-12-25', weekday: 'sábado', name: 'Natal', kinds: ['national_holiday'] },
  { date: '2027-12-31', weekday: 'sexta-feira', name: 'Ponto Facultativo', kinds: ['optional'] },
] as const;

export const PINDAMONHANGABA_HOLIDAYS_BY_YEAR = {
  2026: PINDAMONHANGABA_HOLIDAYS_2026,
  2027: PINDAMONHANGABA_HOLIDAYS_2027,
} as const;

export const PINDAMONHANGABA_HOLIDAYS = [
  ...PINDAMONHANGABA_HOLIDAYS_2026,
  ...PINDAMONHANGABA_HOLIDAYS_2027,
] as const;

const holidayByDate = new Map(PINDAMONHANGABA_HOLIDAYS.map((holiday) => [holiday.date, holiday]));

export function getHolidaysForYear(year: number) {
  return PINDAMONHANGABA_HOLIDAYS_BY_YEAR[year as keyof typeof PINDAMONHANGABA_HOLIDAYS_BY_YEAR] ?? [];
}

export function dateKey(value: Date | string) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function getHolidayByDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return holidayByDate.get(dateKey(value)) ?? null;
}

export function holidayKindLabels(holiday: InstitutionalHoliday) {
  return holiday.kinds.map((kind) => HOLIDAY_KIND_LABELS[kind]);
}

export function holidayShortLabels(holiday: InstitutionalHoliday) {
  return holiday.kinds.map((kind) => HOLIDAY_KIND_SHORT_LABELS[kind]);
}

export function formatHolidaySummary(holiday: InstitutionalHoliday) {
  return `${holiday.name} · ${holidayKindLabels(holiday).join(' e ')}`;
}

export function isPartialHoliday(holiday: InstitutionalHoliday | null) {
  return holiday?.kinds.includes('partial_optional') ?? false;
}

export function isFullNonWorkingHoliday(holiday: InstitutionalHoliday | null) {
  return !!holiday && !isPartialHoliday(holiday);
}

export function holidayTone(holiday: InstitutionalHoliday | null) {
  if (!holiday) return 'none';
  if (holiday.kinds.includes('national_holiday')) return 'red';
  if (holiday.kinds.includes('state_holiday')) return 'orange';
  if (holiday.kinds.includes('municipal_holiday')) return 'orange';
  if (holiday.kinds.includes('partial_optional')) return 'amber';
  return 'amber';
}

export function getHolidaySchedulingNotice(date: Date | string | null | undefined) {
  const holiday = getHolidayByDate(date);
  if (!holiday) return null;

  if (isPartialHoliday(holiday)) {
    return {
      holiday,
      blocksFullDay: false,
      message:
        holiday.note ??
        `Ponto facultativo parcial. Use horários a partir de ${holiday.partialStartTime ?? '13:00'}.`,
    };
  }

  return {
    holiday,
    blocksFullDay: true,
    message: `${formatHolidaySummary(holiday)}. Evite prazos e agendamentos para este dia.`,
  };
}

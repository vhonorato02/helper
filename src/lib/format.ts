export const DATE_FORMATS = {
  dashboardDay: "EEEE, d 'de' MMMM",
  dashboardRecent: "dd 'de' MMM 'às' HH:mm",
  tableCreated: "dd/MM 'às' HH:mm",
  csvDateTime: 'dd/MM/yyyy HH:mm',
  csvFileDate: 'yyyy-MM-dd',
  dateInput: 'yyyy-MM-dd',
  monthYear: "MMM 'de' yyyy",
  ticketDetail: "dd 'de' MMMM 'às' HH:mm",
} as const;

const APP_TIME_ZONE = 'America/Sao_Paulo';
const LOCALE = 'pt-BR';

function dateParts(date: Date | string) {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(date));

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function longMonth(date: Date | string) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: APP_TIME_ZONE,
    month: 'long',
  }).format(new Date(date));
}

function shortMonth(date: Date | string) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: APP_TIME_ZONE,
    month: 'short',
  })
    .format(new Date(date))
    .replace('.', '');
}

function weekday(date: Date | string) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: APP_TIME_ZONE,
    weekday: 'long',
  }).format(new Date(date));
}

export function formatPtBrDate(date: Date | string, pattern: string) {
  const parts = dateParts(date);

  switch (pattern) {
    case DATE_FORMATS.dashboardDay:
      return `${weekday(date)}, ${Number(parts.day)} de ${longMonth(date)}`;
    case DATE_FORMATS.dashboardRecent:
      return `${parts.day} de ${shortMonth(date)} às ${parts.hour}:${parts.minute}`;
    case DATE_FORMATS.tableCreated:
      return `${parts.day}/${parts.month} às ${parts.hour}:${parts.minute}`;
    case DATE_FORMATS.csvDateTime:
      return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
    case DATE_FORMATS.csvFileDate:
      return `${parts.year}-${parts.month}-${parts.day}`;
    case DATE_FORMATS.dateInput:
      return `${parts.year}-${parts.month}-${parts.day}`;
    case DATE_FORMATS.monthYear:
      return `${shortMonth(date)} de ${parts.year}`;
    case DATE_FORMATS.ticketDetail:
      return `${Number(parts.day)} de ${longMonth(date)} às ${parts.hour}:${parts.minute}`;
    default:
      return new Intl.DateTimeFormat(LOCALE, {
        timeZone: APP_TIME_ZONE,
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(date));
  }
}

export function capitalizeFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function daysSince(date: Date | string, now = new Date()) {
  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(date).getTime()) / (24 * 60 * 60 * 1000)),
  );
}

export function daysUntil(date: Date | string, now = new Date()) {
  const target = new Date(date);
  const today = new Date(now);
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || '?'
  );
}

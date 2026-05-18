import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const DATE_FORMATS = {
  dashboardDay: "EEEE, d 'de' MMMM",
  dashboardRecent: "dd 'de' MMM 'às' HH:mm",
  tableCreated: "dd/MM 'às' HH:mm",
  csvDateTime: 'dd/MM/yyyy HH:mm',
  csvFileDate: 'yyyy-MM-dd',
  monthYear: "MMM 'de' yyyy",
  ticketDetail: "dd 'de' MMMM 'às' HH:mm",
} as const;

export function formatPtBrDate(date: Date | string, pattern: string) {
  return format(new Date(date), pattern, { locale: ptBR });
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

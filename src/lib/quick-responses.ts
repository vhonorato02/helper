import type { Area } from '@/lib/constants';

export type QuickResponseScope = Area | null;

export function isQuickResponseAvailableForTicket(
  responseArea: QuickResponseScope,
  ticketArea: Area,
) {
  return responseArea === null || responseArea === ticketArea;
}

export function quickResponseScopeLabel(responseArea: QuickResponseScope) {
  return responseArea ?? 'Todas';
}

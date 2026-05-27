import type { Status } from '@/lib/constants';

/** Preserva resolvedAt ao arquivar; limpa ao reabrir; define ao resolver. */
export function nextResolvedAt(
  previousStatus: Status,
  nextStatus: Status,
  existing: Date | null,
): Date | null {
  if (nextStatus === 'resolvido') return new Date();
  if (previousStatus === 'resolvido') {
    if (nextStatus === 'arquivado') return existing;
    return null;
  }
  return existing;
}

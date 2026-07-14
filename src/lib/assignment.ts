import { roleDefaultArea, type Area, type UserRole } from '@/lib/constants';

export const PRIMARY_ROLE_BY_AREA = {
  TI: 'ti',
  MKT: 'marketing',
  PF: 'por_fora',
} as const satisfies Record<Area, UserRole>;

export type AreaAssigneeCandidate = {
  id: string;
  role: string | null;
  area: Area | null;
  isActive?: boolean | null;
};

export type OperationalProfileInput = {
  role?: string | null | undefined;
  area?: Area | '' | null | undefined;
};

export type OperationalProfileResult =
  | { ok: true; role: string | null; area: Area | null }
  | { ok: false; error: 'role_area_mismatch' };

export function normalizeOperationalProfile({
  role,
  area,
}: OperationalProfileInput): OperationalProfileResult {
  const normalizedRole = role || null;
  const normalizedArea = area || null;
  const expectedArea = roleDefaultArea(normalizedRole);

  if (normalizedArea && expectedArea && normalizedArea !== expectedArea) {
    return { ok: false, error: 'role_area_mismatch' };
  }

  return {
    ok: true,
    role: normalizedRole,
    area: normalizedArea ?? expectedArea,
  };
}

export function isUserEnabledForArea(user: AreaAssigneeCandidate, area: Area) {
  return user.isActive !== false && user.area === area && user.role === PRIMARY_ROLE_BY_AREA[area];
}

export const isEligibleAssigneeForArea = isUserEnabledForArea;

export function resolveExplicitPrimaryAssignee<T extends AreaAssigneeCandidate>(
  area: Area,
  primaryUserId: string | null | undefined,
  candidates: T[],
) {
  if (!primaryUserId) return null;
  const candidate = candidates.find((user) => user.id === primaryUserId);
  return candidate && isUserEnabledForArea(candidate, area) ? candidate : null;
}

export function selectEligibleAssigneeForArea<T extends AreaAssigneeCandidate>(
  userId: string,
  area: Area,
  candidates: T[],
) {
  const candidate = candidates.find((user) => user.id === userId);
  return candidate && isUserEnabledForArea(candidate, area) ? candidate : null;
}

export function pickPrimaryAssigneeForArea<T extends AreaAssigneeCandidate>(
  users: T[],
  area: Area,
  primaryUserId?: string | null,
) {
  return resolveExplicitPrimaryAssignee(area, primaryUserId, users);
}

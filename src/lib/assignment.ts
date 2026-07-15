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
  operationalAreas?: readonly Area[];
  isActive?: boolean | null;
};

export type OperationalProfileInput = {
  role?: string | null | undefined;
  area?: Area | '' | null | undefined;
  areas?: readonly (Area | '' | null | undefined)[] | null | undefined;
};

export type OperationalProfileResult =
  | { ok: true; role: string | null; area: Area | null; areas: Area[] }
  | { ok: false; error: 'invalid_area' | 'role_area_mismatch' };

const AREA_VALUES = ['TI', 'MKT', 'PF'] as const;

function isArea(value: string | null | undefined): value is Area {
  return AREA_VALUES.some((area) => area === value);
}

function normalizeAreaMemberships(input: OperationalProfileInput) {
  const values = input.areas?.length ? input.areas : [input.area];
  const areas: Area[] = [];

  for (const value of values) {
    if (!value) continue;
    if (!isArea(value)) return null;
    if (!areas.includes(value)) areas.push(value);
  }

  return areas;
}

export function normalizeOperationalProfile({
  role,
  area,
  areas,
}: OperationalProfileInput): OperationalProfileResult {
  const normalizedRole = role || null;
  const normalizedAreas = normalizeAreaMemberships({ area, areas });

  if (!normalizedAreas) return { ok: false, error: 'invalid_area' };
  const requiredArea = roleDefaultArea(normalizedRole);

  if (requiredArea && !normalizedAreas.includes(requiredArea)) {
    return { ok: false, error: 'role_area_mismatch' };
  }

  const orderedAreas = requiredArea
    ? [requiredArea, ...normalizedAreas.filter((item) => item !== requiredArea)]
    : normalizedAreas;

  return {
    ok: true,
    role: normalizedRole,
    area: orderedAreas[0] ?? null,
    areas: orderedAreas,
  };
}

export function isUserEnabledForArea(user: AreaAssigneeCandidate, area: Area) {
  if (user.isActive === false) return false;
  const operationalAreas = user.operationalAreas ?? (user.area ? [user.area] : []);
  const requiredArea = roleDefaultArea(user.role);

  if (requiredArea && !operationalAreas.includes(requiredArea)) return false;

  return operationalAreas.includes(area);
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

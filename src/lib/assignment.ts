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

export type PublicDefaultAssignmentTarget = {
  area: Area;
  assigneeId?: string | null;
};

export type PublicStartAssignmentTarget = PublicDefaultAssignmentTarget;

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
  void area;
  return Boolean(user.id);
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

export function filterInvalidAssignmentsForUser<T extends { area: Area }>(
  user: AreaAssigneeCandidate,
  assignments: T[],
) {
  return assignments.filter((assignment) => !isUserEnabledForArea(user, assignment.area));
}

export function pickPrimaryAssigneeForArea<T extends AreaAssigneeCandidate>(
  users: T[],
  area: Area,
  primaryUserId?: string | null,
) {
  return resolveExplicitPrimaryAssignee(area, primaryUserId, users);
}

export function resolvePublicDefaultAssignment<T extends AreaAssigneeCandidate>(
  ticket: PublicDefaultAssignmentTarget,
  defaultAssignee: T | null | undefined,
):
  | { ok: true; assignee: T; shouldUpdate: boolean }
  | { ok: false; reason: 'missing_default' | 'already_assigned' | 'ineligible_default' } {
  if (!defaultAssignee) return { ok: false, reason: 'missing_default' };
  if (!isUserEnabledForArea(defaultAssignee, ticket.area)) {
    return { ok: false, reason: 'ineligible_default' };
  }
  if (ticket.assigneeId && ticket.assigneeId !== defaultAssignee.id) {
    return { ok: false, reason: 'already_assigned' };
  }

  return {
    ok: true,
    assignee: defaultAssignee,
    shouldUpdate: ticket.assigneeId !== defaultAssignee.id,
  };
}

export function resolvePublicStartAssignment<T extends AreaAssigneeCandidate>(
  ticket: PublicStartAssignmentTarget,
  currentUser: T | null | undefined,
  currentAssignee: T | null | undefined,
):
  | { ok: true; assignee: T; shouldUpdateAssignee: boolean; replacedAssignee: T | null }
  | {
      ok: false;
      reason: 'ineligible_current_user' | 'ineligible_existing_assignee';
      replacedAssignee: T | null;
    } {
  if (ticket.assigneeId && currentAssignee && isUserEnabledForArea(currentAssignee, ticket.area)) {
    return {
      ok: true,
      assignee: currentAssignee,
      shouldUpdateAssignee: false,
      replacedAssignee: null,
    };
  }

  const replacedAssignee = ticket.assigneeId ? (currentAssignee ?? null) : null;
  if (!currentUser || !isUserEnabledForArea(currentUser, ticket.area)) {
    return {
      ok: false,
      reason: replacedAssignee ? 'ineligible_existing_assignee' : 'ineligible_current_user',
      replacedAssignee,
    };
  }

  return {
    ok: true,
    assignee: currentUser,
    shouldUpdateAssignee: true,
    replacedAssignee,
  };
}

export type AssignmentHistoryTarget = {
  id: string;
};

export function buildAssigneeRemovalHistoryRows(
  tickets: readonly AssignmentHistoryTarget[],
  actorId: string | null,
  removedAssigneeName: string,
) {
  return tickets.map((ticket) => ({
    ticketId: ticket.id,
    authorId: actorId,
    field: 'responsavel' as const,
    oldValue: removedAssigneeName,
    newValue: null,
  }));
}

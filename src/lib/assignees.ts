import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { areaPrimaryAssignees, userAreas, users } from '@/db/schema';
import type { Area } from '@/lib/constants';
import {
  resolveExplicitPrimaryAssignee,
  selectEligibleAssigneeForArea,
} from '@/lib/assignment';

async function getAreaRowsForUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  return db
    .select({ userId: userAreas.userId, area: userAreas.area })
    .from(userAreas)
    .where(inArray(userAreas.userId, userIds));
}

async function getActiveAssigneeCandidates() {
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      role: users.role,
      area: users.area,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.displayName));
  const areaRows = await getAreaRowsForUsers(rows.map((user) => user.id));
  const areasByUser = new Map<string, Area[]>();

  for (const row of areaRows) {
    const areas = areasByUser.get(row.userId) ?? [];
    if (!areas.includes(row.area)) areas.push(row.area);
    areasByUser.set(row.userId, areas);
  }

  return rows.map((row) => ({
    ...row,
    operationalAreas: [
      ...new Set([...(row.area ? [row.area] : []), ...(areasByUser.get(row.id) ?? [])]),
    ],
  }));
}

export async function findDefaultAssigneeForArea(area: Area) {
  const [primary, rows] = await Promise.all([
    db
      .select({ primaryUserId: areaPrimaryAssignees.primaryUserId })
      .from(areaPrimaryAssignees)
      .where(eq(areaPrimaryAssignees.area, area))
      .limit(1),
    getActiveAssigneeCandidates(),
  ]);

  return resolveExplicitPrimaryAssignee(area, primary[0]?.primaryUserId, rows);
}

export async function findEligibleAssigneeForArea(userId: string, area: Area) {
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      role: users.role,
      area: users.area,
      isActive: users.isActive,
    })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.isActive, true)))
    .limit(1);

  if (rows.length === 0) return null;
  const areaRows = await getAreaRowsForUsers([rows[0].id]);
  const assignee = {
    ...rows[0],
    operationalAreas: [
      ...new Set([
        ...(rows[0].area ? [rows[0].area] : []),
        ...areaRows.map((item) => item.area),
      ]),
    ],
  };
  return selectEligibleAssigneeForArea(assignee.id, area, [assignee]);
}

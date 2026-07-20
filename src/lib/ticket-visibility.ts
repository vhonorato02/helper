import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { tickets } from '@/db/schema';
import { visibleTicketAreas, type AreaScopedUser } from '@/lib/ticket-access';

export function buildTicketVisibilityCondition(
  user: AreaScopedUser | null | undefined,
): SQL | undefined {
  if (!user) return sql`false`;
  if (user.isAdmin === true) return undefined;

  const conditions: SQL[] = [];
  if (user.id) {
    conditions.push(eq(tickets.authorId, user.id));
    conditions.push(eq(tickets.assigneeId, user.id));
  }

  const areas = visibleTicketAreas(user);
  if (areas.length > 0) conditions.push(inArray(tickets.area, areas));

  return conditions.length > 0 ? or(...conditions) : sql`false`;
}

export function withTicketVisibility(
  condition: SQL | undefined,
  user: AreaScopedUser | null | undefined,
): SQL | undefined {
  const visibility = buildTicketVisibilityCondition(user);
  if (!condition) return visibility;
  if (!visibility) return condition;
  return and(condition, visibility);
}

'use server';

import { redirect } from 'next/navigation';
import { asc, eq, inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { tickets, users } from '@/db/schema';
import { AREA_LABELS, type Area } from '@/lib/constants';
import { getTicketRisk } from '@/lib/ticket-risk';

const ACTIVE_STATUSES = ['aberto', 'em_andamento', 'aguardando'] as const;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

function scoreLoad(stats: {
  active: number;
  urgent: number;
  overdue: number;
  waiting: number;
  stale: number;
}) {
  return stats.active * 2 + stats.urgent * 3 + stats.overdue * 4 + stats.waiting + stats.stale * 2;
}

function loadLabel(score: number) {
  if (score >= 24) return 'Carga pesada';
  if (score >= 12) return 'Atenção';
  return 'Controlado';
}

export async function getTeamWorkload() {
  await requireAuth();

  const [team, activeTickets] = await Promise.all([
    db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        role: users.role,
        area: users.area,
        avatarUrl: users.avatarUrl,
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(asc(users.displayName)),
    db
      .select({
        id: tickets.id,
        code: tickets.code,
        area: tickets.area,
        title: tickets.title,
        priority: tickets.priority,
        status: tickets.status,
        dueDate: tickets.dueDate,
        updatedAt: tickets.updatedAt,
        assigneeId: tickets.assigneeId,
      })
      .from(tickets)
      .where(inArray(tickets.status, [...ACTIVE_STATUSES])),
  ]);

  const rowsByUser = new Map(team.map((member) => [member.id, [] as typeof activeTickets]));
  const unassignedByArea = Object.fromEntries(
    Object.keys(AREA_LABELS).map((area) => [area, 0]),
  ) as Record<Area, number>;

  for (const ticket of activeTickets) {
    if (ticket.assigneeId && rowsByUser.has(ticket.assigneeId)) {
      rowsByUser.get(ticket.assigneeId)!.push(ticket);
    } else {
      unassignedByArea[ticket.area] += 1;
    }
  }

  const members = team.map((member) => {
    const assigned = rowsByUser.get(member.id) ?? [];
    const stats = assigned.reduce(
      (acc, ticket) => {
        const risk = getTicketRisk(ticket);
        acc.active += 1;
        if (ticket.priority === 'urgente') acc.urgent += 1;
        if (ticket.status === 'aguardando') acc.waiting += 1;
        if (risk.label === 'Atrasada') acc.overdue += 1;
        if (risk.label === 'Parada') acc.stale += 1;
        return acc;
      },
      { active: 0, urgent: 0, overdue: 0, waiting: 0, stale: 0 },
    );
    const score = scoreLoad(stats);
    const nextFocus = assigned
      .map((ticket) => ({ ticket, risk: getTicketRisk(ticket) }))
      .sort((a, b) => a.risk.rank - b.risk.rank || a.ticket.updatedAt.getTime() - b.ticket.updatedAt.getTime())[0];

    return {
      ...member,
      stats,
      score,
      loadLabel: loadLabel(score),
      nextFocus: nextFocus
        ? {
            code: nextFocus.ticket.code,
            title: nextFocus.ticket.title,
            risk: nextFocus.risk.label,
          }
        : null,
    };
  });

  return {
    members: members.sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName)),
    unassignedByArea,
    totalUnassigned: Object.values(unassignedByArea).reduce((total, value) => total + value, 0),
    totalActive: activeTickets.length,
  };
}

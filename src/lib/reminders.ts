import { and, desc, eq, gte, inArray, isNull, lt, lte, sql } from 'drizzle-orm';
import { appDayEnd, appDayStart } from '@/lib/timezone';
import { db } from '@/db';
import { tickets, ticketHistory, users, schedules } from '@/db/schema';
import {
  buildSimpleEmail,
  getAllRecipients,
  getAppUrl,
  getRecipientsForArea,
  sendGenericEmail,
} from '@/lib/email';
import {
  AREA_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  type Area,
  type Priority,
  type Status,
} from '@/lib/constants';
import { logger } from '@/lib/logger';

const STALE_DAYS = 3;

function ticketUrl(code: string) {
  const base = getAppUrl();
  return base ? `${base}/tickets/${encodeURIComponent(code)}` : null;
}

function ticketLines(t: {
  area: Area;
  priority: Priority;
  status: Status;
  subcategory: string;
  assigneeName?: string | null;
  dueDate?: Date | null;
  updatedAt?: Date;
  location?: string | null;
}) {
  const lines = [
    `Área: ${AREA_LABELS[t.area]} · ${t.subcategory}`,
    `Prioridade: ${PRIORITY_LABELS[t.priority]} · Status: ${STATUS_LABELS[t.status]}`,
  ];
  if (t.assigneeName) lines.push(`Responsável: ${t.assigneeName}`);
  else lines.push('Responsável: ninguém');
  if (t.location) lines.push(`Local: ${t.location}`);
  if (t.dueDate) {
    const d = new Date(t.dueDate);
    lines.push(`Prazo: ${d.toLocaleDateString('pt-BR')}`);
  }
  return lines;
}

function groupByArea<T extends { area: Area }>(rows: T[]): Record<Area, T[]> {
  return rows.reduce(
    (acc, row) => {
      acc[row.area].push(row);
      return acc;
    },
    { TI: [], MKT: [], PF: [] } as Record<Area, T[]>,
  );
}

async function fetchOverdueTickets() {
  return db
    .select({
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      dueDate: tickets.dueDate,
      location: tickets.location,
      assigneeName: users.displayName,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assigneeId, users.id))
    .where(
      and(
        sql`${tickets.dueDate} IS NOT NULL`,
        lte(tickets.dueDate, new Date()),
        inArray(tickets.status, ['aberto', 'em_andamento', 'aguardando']),
      ),
    )
    .orderBy(desc(tickets.priority), tickets.dueDate);
}

async function fetchDueTomorrow() {
  const tomorrowStart = appDayStart(1);
  const dayAfter = appDayEnd(1);
  return db
    .select({
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      dueDate: tickets.dueDate,
      location: tickets.location,
      assigneeName: users.displayName,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assigneeId, users.id))
    .where(
      and(
        gte(tickets.dueDate, tomorrowStart),
        lt(tickets.dueDate, dayAfter),
        inArray(tickets.status, ['aberto', 'em_andamento', 'aguardando']),
      ),
    );
}

async function fetchStaleTickets() {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
  return db
    .select({
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      updatedAt: tickets.updatedAt,
      location: tickets.location,
      assigneeName: users.displayName,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assigneeId, users.id))
    .where(
      and(
        lte(tickets.updatedAt, cutoff),
        inArray(tickets.status, ['aberto', 'em_andamento', 'aguardando']),
      ),
    )
    .orderBy(tickets.updatedAt);
}

async function fetchUnassigned() {
  return db
    .select({
      code: tickets.code,
      area: tickets.area,
      title: tickets.title,
      subcategory: tickets.subcategory,
      priority: tickets.priority,
      status: tickets.status,
      location: tickets.location,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .where(
      and(
        isNull(tickets.assigneeId),
        inArray(tickets.status, ['aberto', 'em_andamento']),
      ),
    )
    .orderBy(desc(tickets.priority), tickets.createdAt);
}

async function fetchSchedulesTomorrow() {
  const tomorrowStart = appDayStart(1);
  const dayAfter = appDayEnd(1);
  return db
    .select({
      id: schedules.id,
      title: schedules.title,
      description: schedules.description,
      scheduledDate: schedules.scheduledDate,
      area: schedules.area,
    })
    .from(schedules)
    .where(
      and(
        eq(schedules.status, 'pendente'),
        gte(schedules.scheduledDate, tomorrowStart),
        lt(schedules.scheduledDate, dayAfter),
      ),
    )
    .orderBy(schedules.scheduledDate);
}

async function fetchSchedulesNextHour() {
  const now = new Date();
  const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
  return db
    .select({
      id: schedules.id,
      title: schedules.title,
      description: schedules.description,
      scheduledDate: schedules.scheduledDate,
      area: schedules.area,
    })
    .from(schedules)
    .where(
      and(
        eq(schedules.status, 'pendente'),
        gte(schedules.scheduledDate, now),
        lte(schedules.scheduledDate, nextHour),
      ),
    )
    .orderBy(schedules.scheduledDate);
}

// ─── Daily morning digest ────────────────────────────────────────────────────

export async function sendDailyDigest() {
  const [overdue, dueTomorrow, unassigned, schedulesTomorrow, schedulesNextHour] =
    await Promise.all([
      fetchOverdueTickets(),
      fetchDueTomorrow(),
      fetchUnassigned(),
      fetchSchedulesTomorrow(),
      fetchSchedulesNextHour(),
    ]);

  const overdueByArea = groupByArea(overdue);
  const dueByArea = groupByArea(dueTomorrow);
  const unassignedByArea = groupByArea(unassigned);

  let totalSent = 0;
  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });

  for (const area of ['TI', 'MKT', 'PF'] as const) {
    const to = getRecipientsForArea(area);
    if (to.length === 0) continue;

    const items: Array<{ heading: string; lines: string[]; url?: string | null }> = [];

    if (overdueByArea[area].length > 0) {
      items.push({
        heading: `🔴 Atrasadas (${overdueByArea[area].length})`,
        lines: [],
      });
      for (const t of overdueByArea[area].slice(0, 8)) {
        items.push({
          heading: `${t.code} — ${t.title}`,
          lines: ticketLines(t),
          url: ticketUrl(t.code),
        });
      }
    }

    if (dueByArea[area].length > 0) {
      items.push({
        heading: `🟡 Vencem amanhã (${dueByArea[area].length})`,
        lines: [],
      });
      for (const t of dueByArea[area].slice(0, 5)) {
        items.push({
          heading: `${t.code} — ${t.title}`,
          lines: ticketLines(t),
          url: ticketUrl(t.code),
        });
      }
    }

    if (unassignedByArea[area].length > 0) {
      items.push({
        heading: `⚪ Sem responsável (${unassignedByArea[area].length})`,
        lines: [],
      });
      for (const t of unassignedByArea[area].slice(0, 5)) {
        items.push({
          heading: `${t.code} — ${t.title}`,
          lines: ticketLines({ ...t, dueDate: null, assigneeName: null }),
          url: ticketUrl(t.code),
        });
      }
    }

    if (items.length === 0) continue;

    const { html, text } = buildSimpleEmail({
      title: `Resumo da agenda — ${AREA_LABELS[area]}`,
      intro: `Bom dia. Hoje (${todayLabel}) temos os seguintes itens pendentes para a área de ${AREA_LABELS[area]}.`,
      items,
      ctaLabel: 'Abrir Helper',
      ctaUrl: getAppUrl() ?? undefined,
    });

    const result = await sendGenericEmail({
      to,
      subject: `[Helper] Resumo ${AREA_LABELS[area]} — ${todayLabel}`,
      html,
      text,
      tag: `daily_digest_${area}`,
    });
    if (result.ok) totalSent += 1;
  }

  // Agenda compartilhada (compromissos) — vai para todos
  if (schedulesTomorrow.length > 0 || schedulesNextHour.length > 0) {
    const allRecipients = getAllRecipients();
    if (allRecipients.length > 0) {
      const items: Array<{ heading: string; lines: string[] }> = [];

      if (schedulesNextHour.length > 0) {
        items.push({ heading: `⏰ Próxima hora (${schedulesNextHour.length})`, lines: [] });
        for (const s of schedulesNextHour) {
          const time = new Date(s.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          items.push({
            heading: `${time} — ${s.title}`,
            lines: [
              s.area ? `Área: ${AREA_LABELS[s.area]}` : 'Geral',
              ...(s.description ? [s.description] : []),
            ],
          });
        }
      }

      if (schedulesTomorrow.length > 0) {
        items.push({ heading: `📅 Amanhã (${schedulesTomorrow.length})`, lines: [] });
        for (const s of schedulesTomorrow) {
          const time = new Date(s.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          items.push({
            heading: `${time} — ${s.title}`,
            lines: [
              s.area ? `Área: ${AREA_LABELS[s.area]}` : 'Geral',
              ...(s.description ? [s.description] : []),
            ],
          });
        }
      }

      const { html, text } = buildSimpleEmail({
        title: 'Lembrete de agendamentos',
        items,
        ctaLabel: 'Ver agenda',
        ctaUrl: `${getAppUrl() ?? ''}/agendamentos`,
      });

      const result = await sendGenericEmail({
        to: allRecipients,
        subject: '[Helper] Lembretes de agenda',
        html,
        text,
        tag: 'schedule_reminder',
      });
      if (result.ok) totalSent += 1;
    }
  }

  logger.info('daily_digest_complete', { totalSent });
  return { sent: totalSent };
}

// ─── Overdue daily nudge (afternoon) ─────────────────────────────────────────

export async function sendOverdueNudge() {
  const overdue = await fetchOverdueTickets();
  if (overdue.length === 0) return { sent: 0 };

  const byArea = groupByArea(overdue);
  let sent = 0;

  for (const area of ['TI', 'MKT', 'PF'] as const) {
    if (byArea[area].length === 0) continue;
    const to = getRecipientsForArea(area);
    if (to.length === 0) continue;

    const items = byArea[area].slice(0, 15).map((t) => ({
      heading: `${t.code} — ${t.title}`,
      lines: ticketLines(t),
      url: ticketUrl(t.code),
    }));

    const { html, text } = buildSimpleEmail({
      title: `${byArea[area].length} demanda(s) atrasada(s) — ${AREA_LABELS[area]}`,
      intro:
        'Estas demandas passaram do prazo e ainda não foram resolvidas. Considere reatribuir, ajustar prioridade ou marcar como resolvida.',
      items,
      ctaLabel: 'Ver lista completa',
      ctaUrl: `${getAppUrl() ?? ''}/tickets?area=${area}&due=overdue`,
    });

    const result = await sendGenericEmail({
      to,
      subject: `[Helper] ${AREA_LABELS[area]}: ${byArea[area].length} demanda(s) atrasada(s)`,
      html,
      text,
      tag: `overdue_nudge_${area}`,
    });
    if (result.ok) sent += 1;
  }

  return { sent };
}

// ─── Stale ticket weekly nudge ───────────────────────────────────────────────

export async function sendStaleNudge() {
  const stale = await fetchStaleTickets();
  if (stale.length === 0) return { sent: 0 };

  const byArea = groupByArea(stale);
  let sent = 0;

  for (const area of ['TI', 'MKT', 'PF'] as const) {
    if (byArea[area].length === 0) continue;
    const to = getRecipientsForArea(area);
    if (to.length === 0) continue;

    const items = byArea[area].slice(0, 15).map((t) => ({
      heading: `${t.code} — ${t.title}`,
      lines: [
        ...ticketLines(t),
        `Sem movimento desde ${new Date(t.updatedAt!).toLocaleDateString('pt-BR')}`,
      ],
      url: ticketUrl(t.code),
    }));

    const { html, text } = buildSimpleEmail({
      title: `Demandas paradas — ${AREA_LABELS[area]}`,
      intro: `Estas demandas estão há mais de ${STALE_DAYS} dias sem atualização. Confirme se ainda fazem sentido ou arquive.`,
      items,
      ctaLabel: 'Ver lista',
      ctaUrl: `${getAppUrl() ?? ''}/tickets?area=${area}&attention=true`,
    });

    const result = await sendGenericEmail({
      to,
      subject: `[Helper] ${AREA_LABELS[area]}: ${byArea[area].length} demanda(s) parada(s)`,
      html,
      text,
      tag: `stale_nudge_${area}`,
    });
    if (result.ok) sent += 1;
  }

  return { sent };
}

// ─── Imminent schedule reminder (1 hour) ─────────────────────────────────────

export async function sendImminentScheduleReminder() {
  const items = await fetchSchedulesNextHour();
  if (items.length === 0) return { sent: 0 };

  const to = getAllRecipients();
  if (to.length === 0) return { sent: 0 };

  const built = buildSimpleEmail({
    title: '⏰ Agendamento na próxima hora',
    items: items.map((s) => ({
      heading: `${new Date(s.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} — ${s.title}`,
      lines: [
        s.area ? `Área: ${AREA_LABELS[s.area]}` : 'Geral',
        ...(s.description ? [s.description] : []),
      ],
    })),
    ctaLabel: 'Ver agenda',
    ctaUrl: `${getAppUrl() ?? ''}/agendamentos`,
  });

  const result = await sendGenericEmail({
    to,
    subject: '[Helper] Agendamento próximo',
    html: built.html,
    text: built.text,
    tag: 'schedule_imminent',
  });
  return { sent: result.ok ? 1 : 0 };
}

// ─── PF preventive maintenance reminder ──────────────────────────────────────
// Avisar a cada 90 dias para verificar status dos equipamentos PF

export async function sendPfPreventiveReminder() {
  const to = getRecipientsForArea('PF');
  if (to.length === 0) return { sent: 0 };

  // Conta tickets PF abertos por subcategoria
  const counts = await db
    .select({
      subcategory: tickets.subcategory,
      total: sql<number>`count(*)`,
    })
    .from(tickets)
    .where(
      and(
        eq(tickets.area, 'PF'),
        inArray(tickets.status, ['aberto', 'em_andamento', 'aguardando']),
      ),
    )
    .groupBy(tickets.subcategory);

  const items: Array<{ heading: string; lines: string[] }> = [
    {
      heading: '🔧 Manutenção preventiva — Por Fora',
      lines: [
        'Lembrete trimestral: verifique o estado dos equipamentos de segurança e infraestrutura externa.',
      ],
    },
    {
      heading: 'Checklist sugerido',
      lines: [
        '• Câmeras: imagem, ângulo, limpeza da lente',
        '• DVR/NVR: gravação, armazenamento, backup',
        '• Alarme: sensores, sirenes, bateria',
        '• Portão eletrônico: motor, controle, fim de curso',
        '• Cerca elétrica: tensão, isoladores, hastes',
        '• Interfone: áudio, vídeo, botões',
        '• Cabeamento: conectores, roteador, switch',
      ],
    },
  ];

  if (counts.length > 0) {
    items.push({
      heading: 'Demandas abertas por subcategoria',
      lines: counts.map((c) => `• ${c.subcategory}: ${c.total}`),
    });
  }

  const built = buildSimpleEmail({
    title: 'Lembrete preventivo — Por Fora',
    items,
    ctaLabel: 'Abrir Helper',
    ctaUrl: `${getAppUrl() ?? ''}/tickets?area=PF`,
  });

  const result = await sendGenericEmail({
    to,
    subject: '[Helper] PF: lembrete de manutenção preventiva',
    html: built.html,
    text: built.text,
    tag: 'pf_preventive',
  });
  return { sent: result.ok ? 1 : 0 };
}

// ─── Auto-archive resolved 30+ days ──────────────────────────────────────────

export async function autoArchiveOldResolved() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ id: tickets.id, code: tickets.code })
    .from(tickets)
    .where(
      and(
        eq(tickets.status, 'resolvido'),
        sql`${tickets.resolvedAt} IS NOT NULL`,
        lte(tickets.resolvedAt, cutoff),
      ),
    );

  if (rows.length === 0) return { archived: 0 };

  await db
    .update(tickets)
    .set({ status: 'arquivado', updatedAt: new Date() })
    .where(inArray(tickets.id, rows.map((r) => r.id)));

  // Registra no histórico
  if (rows.length > 0) {
    await db.insert(ticketHistory).values(
      rows.map((r) => ({
        ticketId: r.id,
        authorId: null,
        field: 'status',
        oldValue: 'resolvido',
        newValue: 'arquivado',
      })),
    );
  }

  logger.info('auto_archive_complete', { count: rows.length });
  return { archived: rows.length };
}

// ─── Auto-move long-stale tickets to "aguardando" ────────────────────────────

const AUTO_STALE_DAYS = 7;

export async function autoMoveStaleToWaiting() {
  const cutoff = new Date(Date.now() - AUTO_STALE_DAYS * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({ id: tickets.id, code: tickets.code, status: tickets.status })
    .from(tickets)
    .where(
      and(
        inArray(tickets.status, ['aberto', 'em_andamento']),
        lte(tickets.updatedAt, cutoff),
      ),
    );

  if (rows.length === 0) return { moved: 0 };

  await db
    .update(tickets)
    .set({ status: 'aguardando', updatedAt: new Date() })
    .where(inArray(tickets.id, rows.map((r) => r.id)));

  await db.insert(ticketHistory).values(
    rows.map((r) => ({
      ticketId: r.id,
      authorId: null,
      field: 'status',
      oldValue: r.status,
      newValue: 'aguardando',
    })),
  );

  logger.info('auto_stale_to_waiting_complete', { count: rows.length });
  return { moved: rows.length };
}

// ─── Weekly summary digest ───────────────────────────────────────────────────

export async function sendWeeklySummary() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Métricas por área
  const summary = await db
    .select({
      area: tickets.area,
      criadas: sql<number>`count(*) filter (where ${tickets.createdAt} >= ${weekAgo})`,
      resolvidas: sql<number>`count(*) filter (where ${tickets.status} = 'resolvido' and ${tickets.resolvedAt} >= ${weekAgo})`,
      backlog: sql<number>`count(*) filter (where ${tickets.status} in ('aberto', 'em_andamento', 'aguardando'))`,
      avgResolucaoHoras: sql<number>`coalesce(round(avg(extract(epoch from (${tickets.resolvedAt} - ${tickets.createdAt}))/3600) filter (where ${tickets.status} = 'resolvido' and ${tickets.resolvedAt} >= ${weekAgo})), 0)`,
    })
    .from(tickets)
    .groupBy(tickets.area);

  let sent = 0;

  for (const area of ['TI', 'MKT', 'PF'] as const) {
    const row = summary.find((r) => r.area === area);
    if (!row) continue;
    const to = getRecipientsForArea(area);
    if (to.length === 0) continue;

    const items = [
      {
        heading: `📊 Resumo semanal — ${AREA_LABELS[area]}`,
        lines: [
          `${Number(row.criadas)} demanda(s) criada(s) nos últimos 7 dias`,
          `${Number(row.resolvidas)} demanda(s) resolvida(s)`,
          `${Number(row.backlog)} demanda(s) em backlog (aberto/em andamento/aguardando)`,
          ...(Number(row.avgResolucaoHoras) > 0
            ? [`Tempo médio de resolução: ${Math.round(Number(row.avgResolucaoHoras))}h`]
            : []),
        ],
      },
    ];

    const built = buildSimpleEmail({
      title: `Resumo semanal — ${AREA_LABELS[area]}`,
      intro: 'Métricas dos últimos 7 dias.',
      items,
      ctaLabel: 'Abrir painel',
      ctaUrl: `${getAppUrl() ?? ''}`,
    });

    const result = await sendGenericEmail({
      to,
      subject: `[Helper] Resumo semanal — ${AREA_LABELS[area]}`,
      html: built.html,
      text: built.text,
      tag: `weekly_summary_${area}`,
    });
    if (result.ok) sent += 1;
  }

  return { sent };
}


import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { ticketTasks, tickets, users } from '@/db/schema';
import { findExternalLinkByLocal, saveExternalLink } from '@/lib/integrations/external-links';
import {
  closeTodoistTask,
  createTodoistTask,
  helperPriorityToTodoist,
  reopenTodoistTask,
  updateTodoistTask,
  type TodoistTaskInput,
} from '@/lib/integrations/todoist-client';

const VALID_AREAS = ['TI', 'MKT', 'PF'] as const;
type Area = (typeof VALID_AREAS)[number];

function configuredAreas(): Area[] {
  const raw = process.env.TODOIST_SYNC_AREAS ?? 'MKT';
  const values = raw.split(',').map((value) => value.trim().toUpperCase());
  const areas = VALID_AREAS.filter((area) => values.includes(area));
  return areas.length > 0 ? [...areas] : ['MKT'];
}

function dueFields(date: Date | null): Pick<TodoistTaskInput, 'due_datetime'> {
  return date ? { due_datetime: date.toISOString() } : {};
}

export async function syncTodoistTickets() {
  const projectId = process.env.TODOIST_PROJECT_ID;
  if (!projectId) throw new Error('TODOIST_PROJECT_ID não configurado.');

  const assigneeUsername = process.env.TODOIST_SYNC_ASSIGNEE_USERNAME?.trim().toLowerCase();
  const conditions = [
    inArray(tickets.area, configuredAreas()),
    inArray(tickets.status, ['aberto', 'em_andamento', 'aguardando']),
  ];
  if (assigneeUsername) conditions.push(eq(users.username, assigneeUsername));

  const rows = await db
    .select({
      id: tickets.id,
      code: tickets.code,
      title: tickets.title,
      description: tickets.description,
      area: tickets.area,
      priority: tickets.priority,
      status: tickets.status,
      dueDate: tickets.dueDate,
      assigneeName: users.displayName,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.assigneeId, users.id))
    .where(and(...conditions))
    .orderBy(asc(tickets.createdAt));

  let created = 0;
  let updated = 0;
  let taskCount = 0;
  const appUrl = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');

  for (const ticket of rows) {
    const parentInput: TodoistTaskInput = {
      content: `${ticket.code} · ${ticket.title}`,
      description: [
        ticket.description,
        `Status: ${ticket.status}`,
        ticket.assigneeName ? `Responsável: ${ticket.assigneeName}` : null,
        appUrl ? `${appUrl}/tickets/${ticket.code}` : null,
      ].filter(Boolean).join('\n\n'),
      project_id: projectId,
      priority: helperPriorityToTodoist(ticket.priority),
      labels: [`helper`, ticket.area.toLowerCase()],
      ...dueFields(ticket.dueDate),
    };

    let parentLink = await findExternalLinkByLocal('todoist', 'ticket', ticket.id);
    if (!parentLink) {
      const external = await createTodoistTask(parentInput);
      parentLink = await saveExternalLink({
        provider: 'todoist',
        resourceType: 'ticket',
        localId: ticket.id,
        externalId: external.id,
        metadata: { code: ticket.code, status: ticket.status },
      });
      created += 1;
    } else {
      await updateTodoistTask(parentLink.externalId, parentInput);
      await saveExternalLink({
        provider: 'todoist',
        resourceType: 'ticket',
        localId: ticket.id,
        externalId: parentLink.externalId,
        metadata: { code: ticket.code, status: ticket.status },
      });
      updated += 1;
    }

    const checklist = await db
      .select()
      .from(ticketTasks)
      .where(eq(ticketTasks.ticketId, ticket.id))
      .orderBy(asc(ticketTasks.createdAt));

    for (const item of checklist) {
      const taskLink = await findExternalLinkByLocal('todoist', 'ticket_task', item.id);
      const input: TodoistTaskInput = {
        content: item.title,
        project_id: projectId,
        parent_id: parentLink.externalId,
        labels: ['helper-checklist', ticket.area.toLowerCase()],
      };
      if (!taskLink) {
        const external = await createTodoistTask(input);
        await saveExternalLink({
          provider: 'todoist',
          resourceType: 'ticket_task',
          localId: item.id,
          externalId: external.id,
          metadata: { ticketId: ticket.id, isDone: item.isDone },
        });
        if (item.isDone) await closeTodoistTask(external.id);
      } else {
        await updateTodoistTask(taskLink.externalId, input);
        const previouslyDone = taskLink.metadata?.isDone === true;
        if (item.isDone && !previouslyDone) await closeTodoistTask(taskLink.externalId);
        if (!item.isDone && previouslyDone) await reopenTodoistTask(taskLink.externalId);
        await saveExternalLink({
          provider: 'todoist',
          resourceType: 'ticket_task',
          localId: item.id,
          externalId: taskLink.externalId,
          metadata: { ticketId: ticket.id, isDone: item.isDone },
        });
      }
      taskCount += 1;
    }
  }

  return { ok: true, tickets: rows.length, created, updated, checklistItems: taskCount };
}

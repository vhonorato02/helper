import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { externalLinks, ticketHistory, ticketTasks, tickets } from '@/db/schema';
import { findExternalLinkByExternal } from '@/lib/integrations/external-links';

type TodoistWebhook = {
  event_name?: string;
  event_data?: { id?: string; due?: { date?: string } | null };
  event_data_extra?: { update_intent?: string };
};

function completionState(payload: TodoistWebhook): boolean | null {
  if (payload.event_name === 'item:completed') return true;
  if (payload.event_name === 'item:uncompleted') return false;
  if (payload.event_data_extra?.update_intent === 'item_completed') return true;
  if (payload.event_data_extra?.update_intent === 'item_uncompleted') return false;
  return null;
}

export async function applyTodoistWebhook(payload: Record<string, unknown>) {
  const webhook = payload as TodoistWebhook;
  const externalId = webhook.event_data?.id;
  if (!externalId) return { ignored: true, reason: 'missing_task_id' };

  const link = await findExternalLinkByExternal('todoist', String(externalId));
  if (!link) return { ignored: true, reason: 'unlinked_task' };
  const done = completionState(webhook);

  if (link.resourceType === 'ticket_task' && done !== null) {
    const now = new Date();
    await db
      .update(ticketTasks)
      .set({ isDone: done, completedAt: done ? now : null, updatedAt: now })
      .where(eq(ticketTasks.id, link.localId));
    await db
      .update(externalLinks)
      .set({ metadata: { ...link.metadata, isDone: done }, lastSyncedAt: now, updatedAt: now })
      .where(eq(externalLinks.id, link.id));
    return { applied: true, resourceType: link.resourceType, done };
  }

  if (link.resourceType === 'ticket') {
    if (done !== null) {
      const [ticket] = await db
        .select({ id: tickets.id, status: tickets.status })
        .from(tickets)
        .where(eq(tickets.id, link.localId))
        .limit(1);
      if (!ticket) return { ignored: true, reason: 'ticket_missing' };
      const status = done ? 'aguardando' : 'em_andamento';
      if (ticket.status !== 'resolvido' && ticket.status !== 'arquivado' && ticket.status !== status) {
        await db.update(tickets).set({ status, updatedAt: new Date() }).where(eq(tickets.id, ticket.id));
        await db.insert(ticketHistory).values({
          ticketId: ticket.id,
          authorId: null,
          field: 'status_todoist',
          oldValue: ticket.status,
          newValue: status,
        });
      }
    }

    const dueValue = webhook.event_data?.due?.date;
    if (dueValue && /^\d{4}-\d{2}-\d{2}/.test(dueValue)) {
      const dueDate = new Date(dueValue.length === 10 ? `${dueValue}T12:00:00-03:00` : dueValue);
      if (!Number.isNaN(dueDate.getTime())) {
        await db.update(tickets).set({ dueDate, updatedAt: new Date() }).where(eq(tickets.id, link.localId));
      }
    }
    return { applied: true, resourceType: link.resourceType, done };
  }

  return { ignored: true, reason: 'unsupported_resource' };
}

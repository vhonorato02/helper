import { and, asc, eq, lte } from 'drizzle-orm';
import { db } from '@/db';
import { integrationEvents } from '@/db/schema';

export async function enqueueIntegrationEvent(input: {
  provider: string;
  direction: 'inbound' | 'outbound';
  eventType: string;
  deliveryId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  payload: Record<string, unknown>;
}) {
  const [created] = await db
    .insert(integrationEvents)
    .values(input)
    .onConflictDoNothing()
    .returning({ id: integrationEvents.id });
  return { id: created?.id ?? null, duplicate: !created };
}

export async function getPendingIntegrationEvents(limit = 20) {
  return db
    .select()
    .from(integrationEvents)
    .where(
      and(
        eq(integrationEvents.status, 'pending'),
        lte(integrationEvents.availableAt, new Date()),
      ),
    )
    .orderBy(asc(integrationEvents.createdAt))
    .limit(Math.max(1, Math.min(limit, 100)));
}

export async function markIntegrationEventProcessing(id: string) {
  const [claimed] = await db
    .update(integrationEvents)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(and(eq(integrationEvents.id, id), eq(integrationEvents.status, 'pending')))
    .returning({ id: integrationEvents.id });
  return Boolean(claimed);
}

export async function markIntegrationEventDone(id: string) {
  const now = new Date();
  await db
    .update(integrationEvents)
    .set({ status: 'done', processedAt: now, updatedAt: now, lastError: null })
    .where(eq(integrationEvents.id, id));
}

export async function markIntegrationEventFailed(id: string, attempts: number, error: unknown) {
  const retry = attempts < 5;
  const delayMinutes = Math.min(2 ** Math.max(attempts, 1), 60);
  await db
    .update(integrationEvents)
    .set({
      status: retry ? 'pending' : 'failed',
      attempts,
      lastError: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
      availableAt: new Date(Date.now() + delayMinutes * 60_000),
      updatedAt: new Date(),
    })
    .where(eq(integrationEvents.id, id));
}

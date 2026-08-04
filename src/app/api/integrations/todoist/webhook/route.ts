import { NextResponse } from 'next/server';
import { enqueueIntegrationEvent } from '@/lib/integrations/integration-events';
import { processIntegrationEvents } from '@/lib/integrations/process-events';
import { verifyWebhookSignature } from '@/lib/integrations/webhook-signature';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.TODOIST_CLIENT_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'todoist_not_configured' }, { status: 503 });
  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get('x-todoist-hmac-sha256'), secret)) {
    return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const queued = await enqueueIntegrationEvent({
    provider: 'todoist',
    direction: 'inbound',
    eventType: typeof payload.event_name === 'string' ? payload.event_name : 'unknown',
    deliveryId: request.headers.get('x-todoist-delivery-id'),
    entityType: 'todoist_task',
    entityId: String((payload.event_data as { id?: unknown } | undefined)?.id ?? '') || null,
    payload,
  });

  if (!queued.duplicate) {
    try {
      await processIntegrationEvents(10);
    } catch (error) {
      logger.error('todoist_webhook_processing_deferred', { error });
    }
  }
  return NextResponse.json({ ok: true, queued: !queued.duplicate, duplicate: queued.duplicate });
}

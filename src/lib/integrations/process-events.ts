import {
  getPendingIntegrationEvents,
  markIntegrationEventDone,
  markIntegrationEventFailed,
  markIntegrationEventProcessing,
} from '@/lib/integrations/integration-events';
import { applyTodoistWebhook } from '@/lib/integrations/todoist-webhook';

export async function processIntegrationEvents(limit = 20) {
  const pending = await getPendingIntegrationEvents(limit);
  const results: Array<{ id: string; ok: boolean; result?: unknown; error?: string }> = [];

  for (const event of pending) {
    if (!(await markIntegrationEventProcessing(event.id))) continue;
    try {
      const result = event.provider === 'todoist'
        ? await applyTodoistWebhook(event.payload)
        : { ignored: true, reason: 'unsupported_provider' };
      await markIntegrationEventDone(event.id);
      results.push({ id: event.id, ok: true, result });
    } catch (error) {
      await markIntegrationEventFailed(event.id, event.attempts + 1, error);
      results.push({
        id: event.id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { ok: results.every((item) => item.ok), processed: results.length, results };
}

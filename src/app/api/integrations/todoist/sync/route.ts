import { NextResponse } from 'next/server';
import { assertIntegrationAccess } from '@/lib/integrations/integration-auth';
import { syncTodoistTickets } from '@/lib/integrations/todoist-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const denied = assertIntegrationAccess(request);
  if (denied) return denied;
  try {
    return NextResponse.json(await syncTodoistTickets());
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'todoist_sync_failed' },
      { status: 500 },
    );
  }
}

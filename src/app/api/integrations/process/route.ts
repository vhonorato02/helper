import { NextResponse } from 'next/server';
import { assertIntegrationAccess } from '@/lib/integrations/integration-auth';
import { processIntegrationEvents } from '@/lib/integrations/process-events';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  const denied = assertIntegrationAccess(request);
  if (denied) return denied;
  return NextResponse.json(await processIntegrationEvents(50));
}

import { NextResponse } from 'next/server';
import { assertIntegrationAccess } from '@/lib/integrations/integration-auth';
import { createPublicationDraft, listPublications } from '@/lib/integrations/marketing-publications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const denied = assertIntegrationAccess(request);
  if (denied) return denied;
  return NextResponse.json({ ok: true, publications: await listPublications() });
}

export async function POST(request: Request) {
  const denied = assertIntegrationAccess(request);
  if (denied) return denied;
  try {
    const created = await createPublicationDraft(await request.json());
    return NextResponse.json({ ok: true, publication: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'invalid_publication' },
      { status: 400 },
    );
  }
}

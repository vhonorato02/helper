import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendTicketNotification } from '@/lib/email';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function handle(area: 'TI' | 'MKT' | 'PF') {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const result = await sendTicketNotification({
    type: 'ticket_created',
    actorName: `${session.user.name ?? 'Admin'} (teste)`,
    ticket: {
      code: 'TESTE-0000',
      area,
      title: `[TESTE] Verificação de envio — área ${area}`,
      subcategory: 'Teste',
      priority: 'media',
      status: 'aberto',
      origin: 'Endpoint /api/admin/test-email',
    },
  });

  logger.info('test_email_triggered', { area, by: session.user.username, result });
  return NextResponse.json({ ok: true, sent: result });
}

function parseArea(raw: unknown): 'TI' | 'MKT' | 'PF' {
  return raw === 'MKT' || raw === 'PF' ? raw : 'TI';
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { area?: string };
  return handle(parseArea(body.area));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  return handle(parseArea(url.searchParams.get('area')));
}

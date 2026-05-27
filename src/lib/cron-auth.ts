import { NextResponse } from 'next/server';

/**
 * Verifica se a chamada veio do cron da Vercel.
 * Vercel envia o header `Authorization: Bearer ${CRON_SECRET}` automaticamente.
 * Em desenvolvimento, libera para facilitar testes locais.
 */
export function assertCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'cron_secret_not_configured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

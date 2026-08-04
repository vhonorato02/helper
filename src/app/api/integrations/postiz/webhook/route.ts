import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hasValidBearerToken } from '@/lib/bearer-token';
import { applyPostizResult } from '@/lib/integrations/marketing-publications';

const payloadSchema = z.object({
  helperPublicationId: z.string().uuid().optional(),
  postizId: z.string().trim().min(1).max(300).optional(),
  status: z.enum(['scheduled', 'published', 'failed']),
  publishedUrls: z.record(z.string(), z.string().url()).optional(),
  metrics: z.record(z.string(), z.number().finite()).optional(),
  failureReason: z.string().max(2000).nullish(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.POSTIZ_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'postiz_not_configured' }, { status: 503 });
  if (!hasValidBearerToken(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!parsed.data.helperPublicationId && !parsed.data.postizId)) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, publication: await applyPostizResult(parsed.data) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'postiz_update_failed' },
      { status: 409 },
    );
  }
}

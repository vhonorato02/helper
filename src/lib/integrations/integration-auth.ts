import { NextResponse } from 'next/server';
import { hasValidBearerToken } from '@/lib/bearer-token';

export function assertIntegrationAccess(request: Request): NextResponse | null {
  const secret = process.env.INTEGRATION_API_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'integration_api_not_configured' },
      { status: 503 },
    );
  }
  if (!hasValidBearerToken(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

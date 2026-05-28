import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  userFromClaims,
  verifySessionToken,
} from '@/lib/session';

function isPublicPath(pathname: string) {
  return (
    pathname === '/solicitar' ||
    pathname.startsWith('/solicitar/') ||
    pathname === '/chromebooks/solicitar'
  );
}

export default async function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const claims = await verifySessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const user = claims ? userFromClaims(claims) : null;

  if (nextUrl.pathname.startsWith('/api/cron') || isPublicPath(nextUrl.pathname)) {
    return NextResponse.next();
  }

  const isLoggedIn = !!user?.id;
  const isOnLogin = nextUrl.pathname.startsWith('/login');
  const isPasswordChange = nextUrl.pathname.startsWith('/alterar-senha');

  if (isOnLogin) {
    if (isLoggedIn) return NextResponse.redirect(new URL('/', nextUrl));
    return NextResponse.next();
  }

  if (isLoggedIn && user.mustChangePassword && !isPasswordChange) {
    return NextResponse.redirect(new URL('/alterar-senha', nextUrl));
  }

  if (isLoggedIn) return NextResponse.next();

  const loginUrl = new URL('/login', nextUrl);
  loginUrl.searchParams.set('callbackUrl', nextUrl.href);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/auth|api/admin|api/cron|.*\\..*).*)'],
};

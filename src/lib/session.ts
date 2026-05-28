import { jwtVerify, SignJWT, type JWTPayload } from 'jose';

export const AUTH_COOKIE_NAME = 'helper.session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type SessionUser = {
  id: string;
  username: string;
  isAdmin: boolean;
  name?: string | null;
  mustChangePassword?: boolean;
};

export type SessionClaims = JWTPayload & {
  username: string;
  displayName: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be configured with at least 32 characters.');
  }
  return new TextEncoder().encode(secret);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function signSessionToken(user: SessionUser) {
  return new SignJWT({
    username: user.username,
    displayName: user.name ?? '',
    isAdmin: user.isAdmin,
    mustChangePassword: Boolean(user.mustChangePassword),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string | undefined) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify<SessionClaims>(token, getAuthSecret(), {
      algorithms: ['HS256'],
    });

    if (!payload.sub || !payload.username) return null;
    return payload;
  } catch {
    return null;
  }
}

export function userFromClaims(claims: SessionClaims): SessionUser {
  return {
    id: claims.sub ?? '',
    username: claims.username,
    isAdmin: Boolean(claims.isAdmin),
    name: claims.displayName || null,
    mustChangePassword: Boolean(claims.mustChangePassword),
  };
}

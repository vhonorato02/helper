import { createHash, timingSafeEqual } from 'node:crypto';

function sha256(value: string) {
  return createHash('sha256').update(value).digest();
}

export function parseBearerToken(header: string | null) {
  if (!header) return null;

  const [scheme, token, ...extra] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token || extra.length > 0) return null;

  return token;
}

export function secureTokenEquals(candidate: string | null | undefined, expected: string | null | undefined) {
  if (!candidate || !expected) return false;
  return timingSafeEqual(sha256(candidate), sha256(expected));
}

export function hasValidBearerToken(header: string | null, expectedSecret: string | null | undefined) {
  return secureTokenEquals(parseBearerToken(header), expectedSecret);
}

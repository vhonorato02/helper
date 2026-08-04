import { createHmac, timingSafeEqual } from 'node:crypto';

export function createWebhookSignature(payload: string, secret: string) {
  return createHmac('sha256', secret.trim()).update(payload, 'utf8').digest('base64');
}

export function verifyWebhookSignature(payload: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const expected = Buffer.from(createWebhookSignature(payload, secret));
  const candidate = Buffer.from(signature.trim());
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

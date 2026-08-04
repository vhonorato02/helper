import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createWebhookSignature, verifyWebhookSignature } from '@/lib/integrations/webhook-signature';

describe('webhook signatures', () => {
  it('accepts only a valid base64 HMAC for the exact raw payload', () => {
    const payload = '{"event_name":"item:completed"}';
    const signature = createWebhookSignature(payload, 'client-secret');
    assert.equal(verifyWebhookSignature(payload, signature, 'client-secret'), true);
    assert.equal(verifyWebhookSignature(`${payload} `, signature, 'client-secret'), false);
    assert.equal(verifyWebhookSignature(payload, null, 'client-secret'), false);
  });
});

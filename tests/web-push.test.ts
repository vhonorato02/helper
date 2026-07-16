import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getPublicVapidKey,
  normalizePushSubscriptionPayload,
  sendPushNotificationToUsers,
} from '@/lib/web-push';

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe('web push helpers', () => {
  it('normaliza assinatura PushSubscriptionJSON valida', () => {
    const payload = normalizePushSubscriptionPayload({
      endpoint: 'https://push.example.test/send/abc',
      expirationTime: 1790000000000,
      keys: {
        p256dh: 'public-key',
        auth: 'auth-secret',
      },
    });

    assert.deepEqual(payload, {
      endpoint: 'https://push.example.test/send/abc',
      expirationTime: 1790000000000,
      keys: {
        p256dh: 'public-key',
        auth: 'auth-secret',
      },
    });
  });

  it('rejeita assinatura sem endpoint seguro ou chaves', () => {
    assert.equal(normalizePushSubscriptionPayload(null), null);
    assert.equal(
      normalizePushSubscriptionPayload({
        endpoint: 'http://push.example.test/send/abc',
        keys: { p256dh: 'public-key', auth: 'auth-secret' },
      }),
      null,
    );
    assert.equal(
      normalizePushSubscriptionPayload({
        endpoint: 'https://push.example.test/send/abc',
        keys: { p256dh: '', auth: 'auth-secret' },
      }),
      null,
    );
  });

  it('nao tenta banco nem rede quando VAPID nao esta configurado', async () => {
    const previousPublicKey = process.env.VAPID_PUBLIC_KEY;
    const previousPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const previousSubject = process.env.VAPID_SUBJECT;

    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;

    try {
      assert.equal(getPublicVapidKey(), null);
      assert.deepEqual(
        await sendPushNotificationToUsers({
          userIds: ['user-1'],
          payload: { title: 'Teste' },
        }),
        { sent: 0, removed: 0, skipped: 'vapid_missing' },
      );
    } finally {
      restoreEnv('VAPID_PUBLIC_KEY', previousPublicKey);
      restoreEnv('VAPID_PRIVATE_KEY', previousPrivateKey);
      restoreEnv('VAPID_SUBJECT', previousSubject);
    }
  });
});

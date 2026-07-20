import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolvePushPanelStatus,
  supportsBrowserPush,
  type PushRegistrationSnapshot,
} from '@/lib/push-registration-state';

function snapshot(overrides: Partial<PushRegistrationSnapshot> = {}): PushRegistrationSnapshot {
  return {
    permission: 'default',
    publicKey: 'public-key',
    hasSubscription: false,
    currentEndpointRegistered: false,
    subscriptionExpired: false,
    ...overrides,
  };
}

describe('push registration state', () => {
  it('detecta suporte do navegador somente com Notification, Service Worker e PushManager', () => {
    assert.equal(
      supportsBrowserPush({ notification: true, serviceWorker: true, pushManager: true }),
      true,
    );
    assert.equal(
      supportsBrowserPush({ notification: true, serviceWorker: false, pushManager: true }),
      false,
    );
  });

  it('resolve estados indisponivel, negado e servidor sem VAPID', () => {
    assert.equal(resolvePushPanelStatus(snapshot({ permission: 'unsupported' })), 'unsupported');
    assert.equal(resolvePushPanelStatus(snapshot({ permission: 'denied' })), 'denied');
    assert.equal(resolvePushPanelStatus(snapshot({ publicKey: null })), 'unconfigured');
  });

  it('resolve estados ativo e expirado pela assinatura local registrada', () => {
    assert.equal(
      resolvePushPanelStatus(snapshot({
        hasSubscription: true,
        currentEndpointRegistered: true,
      })),
      'active',
    );
    assert.equal(
      resolvePushPanelStatus(snapshot({
        hasSubscription: true,
        currentEndpointRegistered: true,
        subscriptionExpired: true,
      })),
      'expired',
    );
    assert.equal(
      resolvePushPanelStatus(snapshot({
        hasSubscription: true,
        currentEndpointRegistered: false,
      })),
      'expired',
    );
  });
});

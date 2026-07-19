import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldHandleNotificationNavigation } from '@/lib/notification-interactions';

describe('notification navigation interactions', () => {
  it('handles ordinary same-tab primary clicks', () => {
    assert.equal(shouldHandleNotificationNavigation({ button: 0 }), true);
    assert.equal(shouldHandleNotificationNavigation({ target: '_self' }), true);
  });

  it('preserves modified clicks and alternate targets', () => {
    assert.equal(shouldHandleNotificationNavigation({ ctrlKey: true }), false);
    assert.equal(shouldHandleNotificationNavigation({ metaKey: true }), false);
    assert.equal(shouldHandleNotificationNavigation({ shiftKey: true }), false);
    assert.equal(shouldHandleNotificationNavigation({ altKey: true }), false);
    assert.equal(shouldHandleNotificationNavigation({ button: 1 }), false);
    assert.equal(shouldHandleNotificationNavigation({ defaultPrevented: true }), false);
    assert.equal(shouldHandleNotificationNavigation({ target: '_blank' }), false);
  });
});

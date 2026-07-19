import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationTypeEnabledForAlerts,
  preferenceForNotificationType,
} from '@/lib/notification-preferences';

describe('notification preference rules', () => {
  it('classifica tipos de notificação por preferência operacional', () => {
    assert.equal(preferenceForNotificationType('ticket_assigned'), 'ticketCreated');
    assert.equal(preferenceForNotificationType('public_request_created'), 'ticketCreated');
    assert.equal(preferenceForNotificationType('ticket_status_updated'), 'ticketStatus');
    assert.equal(preferenceForNotificationType('comment_mention'), 'commentMention');
    assert.equal(preferenceForNotificationType('daily_digest'), 'dailyDigest');
    assert.equal(preferenceForNotificationType('system_notice'), null);
  });

  it('filtra apenas alertas externos, preservando tipos sem preferência específica', () => {
    const preferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ticketCreated: false,
      ticketStatus: true,
    };

    assert.equal(isNotificationTypeEnabledForAlerts('ticket_assigned', preferences), false);
    assert.equal(isNotificationTypeEnabledForAlerts('public_request_created', preferences), false);
    assert.equal(isNotificationTypeEnabledForAlerts('ticket_status_updated', preferences), true);
    assert.equal(isNotificationTypeEnabledForAlerts('system_notice', preferences), true);
  });
});

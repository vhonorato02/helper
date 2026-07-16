import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeInternalNotificationLink,
  notificationLinkOrDefault,
} from '@/lib/notification-links';

describe('notification links', () => {
  it('mantem caminhos internos com query e hash', () => {
    assert.equal(
      normalizeInternalNotificationLink('/tickets/TI-42?tab=historico#comentarios'),
      '/tickets/TI-42?tab=historico#comentarios',
    );
  });

  it('permite URL absoluta apenas quando a origem esperada foi informada', () => {
    assert.equal(
      normalizeInternalNotificationLink('https://helper.example/tickets/TI-42', {
        allowedOrigin: 'https://helper.example',
      }),
      '/tickets/TI-42',
    );
    assert.equal(normalizeInternalNotificationLink('https://helper.example/tickets/TI-42'), null);
  });

  it('rejeita links externos, protocolo perigoso e caminho protocol-relative', () => {
    assert.equal(
      normalizeInternalNotificationLink('https://evil.example/phish', {
        allowedOrigin: 'https://helper.example',
      }),
      null,
    );
    assert.equal(normalizeInternalNotificationLink('javascript:alert(1)'), null);
    assert.equal(normalizeInternalNotificationLink('//evil.example/phish'), null);
  });

  it('usa a inbox de notificacoes como fallback', () => {
    assert.equal(notificationLinkOrDefault('https://evil.example/phish'), '/notificacoes');
    assert.equal(notificationLinkOrDefault(null), '/notificacoes');
  });
});

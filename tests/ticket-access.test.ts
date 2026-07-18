import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canViewPublicRequesterContact,
  canWorkOnTicketArea,
  protectPublicRequesterData,
  redactPublicRequesterContactLine,
} from '@/lib/ticket-access';

describe('ticket area access rules', () => {
  const tiUser = {
    id: 'ti-user',
    isAdmin: false,
    role: 'ti',
    area: 'TI' as const,
    areas: ['TI'] as const,
  };
  const marketingUser = {
    id: 'marketing-user',
    isAdmin: false,
    role: 'marketing',
    area: 'MKT' as const,
    areas: ['MKT'] as const,
  };
  const admin = {
    id: 'admin',
    isAdmin: true,
    role: 'direcao',
    area: null,
    areas: [] as const,
  };
  const legacyContradictory = {
    id: 'legacy',
    isAdmin: false,
    role: 'marketing',
    area: 'TI' as const,
    areas: ['TI'] as const,
  };

  it('allows admins and same-area operational users to handle a ticket area', () => {
    assert.equal(canWorkOnTicketArea(admin, 'TI'), true);
    assert.equal(canWorkOnTicketArea(tiUser, 'TI'), true);
    assert.equal(canWorkOnTicketArea(marketingUser, 'TI'), false);
  });

  it('keeps legacy contradictory users out of public requester contacts', () => {
    assert.equal(canViewPublicRequesterContact(legacyContradictory, 'TI'), false);
  });

  it('redacts only legacy public contact lines from descriptions', () => {
    assert.equal(
      redactPublicRequesterContactLine(
        '[SOLICITAÇÃO PÚBLICA]\nSolicitante: Escola\nContato: escola@example.com\nLocal/setor: Sala 1\n\nPrecisa de suporte.',
      ),
      '[SOLICITAÇÃO PÚBLICA]\nSolicitante: Escola\nLocal/setor: Sala 1\n\nPrecisa de suporte.',
    );
  });

  it('hides public requester contact from users outside the ticket area', () => {
    const ticket = {
      code: 'TI-0001',
      area: 'TI' as const,
      origin: 'Pagina publica',
      publicContact: 'escola@example.com',
      description: 'Solicitante: Escola\nContato: escola@example.com\nLocal/setor: Sala 1',
    };

    assert.deepEqual(protectPublicRequesterData(ticket, marketingUser), {
      ...ticket,
      publicContact: null,
      description: 'Solicitante: Escola\nLocal/setor: Sala 1',
    });
    assert.deepEqual(protectPublicRequesterData(ticket, tiUser), ticket);
  });

  it('does not redact internal tickets', () => {
    const ticket = {
      code: 'TI-0002',
      area: 'TI' as const,
      origin: 'Interna',
      publicContact: 'internal@example.com',
      description: 'Contato: internal@example.com',
    };

    assert.deepEqual(protectPublicRequesterData(ticket, marketingUser), ticket);
  });
});

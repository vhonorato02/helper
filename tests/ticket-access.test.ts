import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canCommentOnTicket,
  canManageTicket,
  canViewTicket,
  canViewPublicRequesterContact,
  canWorkOnTicketArea,
  protectPublicRequesterData,
  redactPublicRequesterContactLine,
  visibleTicketAreas,
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
  const requester = {
    id: 'requester',
    isAdmin: false,
    role: 'outro',
    area: null,
    areas: [] as const,
  };

  it('allows every authenticated internal user to handle every ticket area', () => {
    assert.equal(canWorkOnTicketArea(admin, 'TI'), true);
    assert.equal(canWorkOnTicketArea(tiUser, 'TI'), true);
    assert.equal(canWorkOnTicketArea(marketingUser, 'TI'), true);
    assert.equal(canWorkOnTicketArea(requester, 'PF'), true);
    assert.equal(canWorkOnTicketArea(undefined, 'TI'), false);
  });

  it('allows ticket management across areas for internal users', () => {
    const ticket = { area: 'TI' as const, authorId: requester.id, assigneeId: null };

    assert.equal(canManageTicket(admin, ticket), true);
    assert.equal(canManageTicket(tiUser, ticket), true);
    assert.equal(canManageTicket(marketingUser, ticket), true);
    assert.equal(canManageTicket(requester, ticket), true);
    assert.equal(canManageTicket(legacyContradictory, ticket), true);
    assert.equal(canManageTicket(undefined, ticket), false);
  });

  it('makes tickets visible to every authenticated internal user', () => {
    const tiTicket = { area: 'TI' as const, authorId: requester.id, assigneeId: tiUser.id };
    const authoredMarketingTicket = {
      area: 'MKT' as const,
      authorId: requester.id,
      assigneeId: marketingUser.id,
    };
    const assignedMarketingTicket = {
      area: 'MKT' as const,
      authorId: marketingUser.id,
      assigneeId: requester.id,
    };

    assert.equal(canViewTicket(admin, tiTicket), true);
    assert.equal(canViewTicket(tiUser, tiTicket), true);
    assert.equal(canViewTicket(marketingUser, tiTicket), true);
    assert.equal(canViewTicket(requester, authoredMarketingTicket), true);
    assert.equal(canViewTicket(requester, assignedMarketingTicket), true);
    assert.equal(canViewTicket(legacyContradictory, tiTicket), true);
    assert.equal(canViewTicket(undefined, tiTicket), false);
  });

  it('shows every area to internal users', () => {
    assert.deepEqual(visibleTicketAreas(admin), ['TI', 'MKT', 'PF']);
    assert.deepEqual(visibleTicketAreas(tiUser), ['TI', 'MKT', 'PF']);
    assert.deepEqual(visibleTicketAreas(marketingUser), ['TI', 'MKT', 'PF']);
    assert.deepEqual(visibleTicketAreas(legacyContradictory), ['TI', 'MKT', 'PF']);
    assert.deepEqual(visibleTicketAreas(requester), ['TI', 'MKT', 'PF']);
    assert.deepEqual(visibleTicketAreas(undefined), []);
  });

  it('allows comments and management across areas for internal users', () => {
    const ticket = { area: 'TI' as const, authorId: requester.id, assigneeId: null };
    const assignedTicket = {
      area: 'MKT' as const,
      authorId: marketingUser.id,
      assigneeId: requester.id,
    };

    assert.equal(canCommentOnTicket(requester, ticket), true);
    assert.equal(canCommentOnTicket(requester, assignedTicket), true);
    assert.equal(canManageTicket(requester, ticket), true);
    assert.equal(canCommentOnTicket(marketingUser, ticket), true);
  });

  it('allows internal users to see public requester contacts across areas', () => {
    assert.equal(canViewPublicRequesterContact(legacyContradictory, 'TI'), true);
    assert.equal(canViewPublicRequesterContact(marketingUser, 'TI'), true);
    assert.equal(canViewPublicRequesterContact(undefined, 'TI'), false);
  });

  it('redacts only legacy public contact lines from descriptions', () => {
    assert.equal(
      redactPublicRequesterContactLine(
        '[SOLICITAÇÃO PÚBLICA]\nSolicitante: Escola\nContato: escola@example.com\nLocal/setor: Sala 1\n\nPrecisa de suporte.',
      ),
      '[SOLICITAÇÃO PÚBLICA]\nSolicitante: Escola\nLocal/setor: Sala 1\n\nPrecisa de suporte.',
    );
  });

  it('shows public requester contact to internal users and hides it from anonymous access', () => {
    const ticket = {
      code: 'TI-0001',
      area: 'TI' as const,
      origin: 'Pagina publica',
      publicContact: 'escola@example.com',
      description: 'Solicitante: Escola\nContato: escola@example.com\nLocal/setor: Sala 1',
    };

    assert.deepEqual(protectPublicRequesterData(ticket, marketingUser), ticket);
    assert.deepEqual(protectPublicRequesterData(ticket, undefined), {
      ...ticket,
      publicContact: null,
      description: 'Solicitante: Escola\nLocal/setor: Sala 1',
    });
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

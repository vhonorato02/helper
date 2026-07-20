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

  it('allows admins and same-area operational users to handle a ticket area', () => {
    assert.equal(canWorkOnTicketArea(admin, 'TI'), true);
    assert.equal(canWorkOnTicketArea(tiUser, 'TI'), true);
    assert.equal(canWorkOnTicketArea(marketingUser, 'TI'), false);
  });

  it('allows ticket management only for admins and eligible users in the ticket area', () => {
    const ticket = { area: 'TI' as const, authorId: requester.id, assigneeId: null };

    assert.equal(canManageTicket(admin, ticket), true);
    assert.equal(canManageTicket(tiUser, ticket), true);
    assert.equal(canManageTicket(marketingUser, ticket), false);
    assert.equal(canManageTicket(requester, ticket), false);
    assert.equal(canManageTicket(legacyContradictory, ticket), false);
  });

  it('limits ticket visibility to admins, same area, author, or assignee', () => {
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
    assert.equal(canViewTicket(marketingUser, tiTicket), false);
    assert.equal(canViewTicket(requester, authoredMarketingTicket), true);
    assert.equal(canViewTicket(requester, assignedMarketingTicket), true);
    assert.equal(canViewTicket(legacyContradictory, tiTicket), false);
  });

  it('derives visible areas from the same operational eligibility rule', () => {
    assert.deepEqual(visibleTicketAreas(admin), ['TI', 'MKT', 'PF']);
    assert.deepEqual(visibleTicketAreas(tiUser), ['TI']);
    assert.deepEqual(visibleTicketAreas(marketingUser), ['MKT']);
    assert.deepEqual(visibleTicketAreas(legacyContradictory), []);
    assert.deepEqual(visibleTicketAreas(requester), []);
  });

  it('allows comments for the ticket author without granting management', () => {
    const ticket = { area: 'TI' as const, authorId: requester.id, assigneeId: null };
    const assignedTicket = {
      area: 'MKT' as const,
      authorId: marketingUser.id,
      assigneeId: requester.id,
    };

    assert.equal(canCommentOnTicket(requester, ticket), true);
    assert.equal(canCommentOnTicket(requester, assignedTicket), true);
    assert.equal(canManageTicket(requester, ticket), false);
    assert.equal(canCommentOnTicket(marketingUser, ticket), false);
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

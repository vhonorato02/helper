import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterInvalidAssignmentsForUser,
  isUserEnabledForArea,
  normalizeOperationalProfile,
  resolveExplicitPrimaryAssignee,
  selectEligibleAssigneeForArea,
  type AreaAssigneeCandidate,
} from '@/lib/assignment';

const users: AreaAssigneeCandidate[] = [
  { id: 'ti-primary', role: 'coordenacao', area: 'TI', operationalAreas: ['TI'], isActive: true },
  {
    id: 'mkt-primary',
    role: 'marketing',
    area: 'MKT',
    operationalAreas: ['MKT', 'PF'],
    isActive: true,
  },
  {
    id: 'cross-trained',
    role: 'marketing',
    area: 'MKT',
    operationalAreas: ['MKT', 'TI'],
    isActive: true,
  },
  { id: 'pf-primary', role: 'por_fora', area: 'PF', operationalAreas: ['PF'], isActive: true },
  { id: 'inactive-ti', role: 'ti', area: 'TI', operationalAreas: ['TI'], isActive: false },
  { id: 'legacy-contradictory', role: 'marketing', area: 'TI', operationalAreas: ['TI'], isActive: true },
  { id: 'role-only-ti', role: 'ti', area: null, isActive: true },
  { id: 'area-only-ti', role: null, area: 'TI', isActive: true },
  { id: 'no-area', role: 'direcao', area: null, operationalAreas: [], isActive: true },
];

describe('area assignment rules', () => {
  it('usa habilitação operacional, não cargo, para TI', () => {
    assert.equal(isUserEnabledForArea(users[0], 'TI'), true);
    assert.equal(isUserEnabledForArea(users[1], 'TI'), false);
    assert.equal(isUserEnabledForArea(users[2], 'TI'), true);
    assert.equal(isUserEnabledForArea(users[5], 'TI'), false);
    assert.equal(isUserEnabledForArea(users[6], 'TI'), false);
    assert.equal(isUserEnabledForArea(users[7], 'TI'), true);
    assert.equal(isUserEnabledForArea(users[8], 'TI'), false);
  });

  it('aceita usuário habilitado em múltiplas áreas', () => {
    assert.equal(isUserEnabledForArea(users[1], 'MKT'), true);
    assert.equal(isUserEnabledForArea(users[1], 'PF'), true);
    assert.equal(isUserEnabledForArea(users[2], 'MKT'), true);
    assert.equal(isUserEnabledForArea(users[2], 'TI'), true);
    assert.equal(isUserEnabledForArea(users[3], 'PF'), true);
    assert.equal(isUserEnabledForArea(users[0], 'MKT'), false);
    assert.equal(isUserEnabledForArea(users[3], 'TI'), false);
  });

  it('rejeita usuário inativo mesmo com cargo e área corretos', () => {
    assert.equal(isUserEnabledForArea(users[4], 'TI'), false);
  });

  it('usa apenas responsável primário explícito e elegível', () => {
    assert.equal(resolveExplicitPrimaryAssignee('TI', 'ti-primary', users)?.id, 'ti-primary');
    assert.equal(resolveExplicitPrimaryAssignee('MKT', 'mkt-primary', users)?.id, 'mkt-primary');
    assert.equal(resolveExplicitPrimaryAssignee('PF', 'pf-primary', users)?.id, 'pf-primary');
  });

  it('não usa fallback quando responsável primário está ausente ou inválido', () => {
    assert.equal(resolveExplicitPrimaryAssignee('TI', undefined, users), null);
    assert.equal(resolveExplicitPrimaryAssignee('TI', 'missing', users), null);
    assert.equal(resolveExplicitPrimaryAssignee('TI', 'mkt-primary', users), null);
    assert.equal(resolveExplicitPrimaryAssignee('TI', 'inactive-ti', users), null);
    assert.equal(resolveExplicitPrimaryAssignee('TI', 'legacy-contradictory', users), null);
  });

  it('valida seleção administrativa de responsável primário pela mesma regra de domínio', () => {
    assert.equal(selectEligibleAssigneeForArea('ti-primary', 'TI', users)?.id, 'ti-primary');
    assert.equal(selectEligibleAssigneeForArea('cross-trained', 'TI', users)?.id, 'cross-trained');
    assert.equal(selectEligibleAssigneeForArea('mkt-primary', 'TI', users), null);
    assert.equal(selectEligibleAssigneeForArea('inactive-ti', 'TI', users), null);
    assert.equal(selectEligibleAssigneeForArea('legacy-contradictory', 'TI', users), null);
    assert.equal(selectEligibleAssigneeForArea('missing', 'TI', users), null);
  });

  it('normaliza cargo e áreas operacionais sem tratar como sinônimos', () => {
    assert.deepEqual(normalizeOperationalProfile({ role: 'ti', areas: ['MKT', 'TI', 'TI'] }), {
      ok: true,
      role: 'ti',
      area: 'TI',
      areas: ['TI', 'MKT'],
    });
    assert.deepEqual(normalizeOperationalProfile({ role: 'coordenacao', area: 'TI' }), {
      ok: true,
      role: 'coordenacao',
      area: 'TI',
      areas: ['TI'],
    });
    assert.deepEqual(normalizeOperationalProfile({ role: 'marketing', area: 'TI' }), {
      ok: false,
      error: 'role_area_mismatch',
    });
    assert.deepEqual(normalizeOperationalProfile({ role: 'marketing', area: '' }), {
      ok: false,
      error: 'role_area_mismatch',
    });
  });

  it('identifica demandas ativas que ficam inválidas após mudança de áreas', () => {
    const user: AreaAssigneeCandidate = {
      id: 'mkt-primary',
      role: 'marketing',
      area: 'MKT',
      operationalAreas: ['MKT'] as const,
      isActive: true,
    };
    const assignments = [
      { id: 'mkt-ticket', area: 'MKT' as const },
      { id: 'ti-ticket', area: 'TI' as const },
      { id: 'pf-ticket', area: 'PF' as const },
    ];

    assert.deepEqual(filterInvalidAssignmentsForUser(user, assignments), [
      { id: 'ti-ticket', area: 'TI' },
      { id: 'pf-ticket', area: 'PF' },
    ]);
    assert.deepEqual(filterInvalidAssignmentsForUser({ ...user, isActive: false }, assignments), assignments);
  });
});

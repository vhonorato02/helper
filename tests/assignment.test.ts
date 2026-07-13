import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isUserEnabledForArea,
  normalizeOperationalProfile,
  resolveExplicitPrimaryAssignee,
  type AreaAssigneeCandidate,
} from '@/lib/assignment';

const users: AreaAssigneeCandidate[] = [
  { id: 'ti-primary', role: 'ti', area: 'TI', isActive: true },
  { id: 'mkt-primary', role: 'marketing', area: 'MKT', isActive: true },
  { id: 'pf-primary', role: 'por_fora', area: 'PF', isActive: true },
  { id: 'inactive-ti', role: 'ti', area: 'TI', isActive: false },
  { id: 'legacy-contradictory', role: 'marketing', area: 'TI', isActive: true },
  { id: 'role-only-ti', role: 'ti', area: null, isActive: true },
  { id: 'area-only-ti', role: null, area: 'TI', isActive: true },
];

describe('area assignment rules', () => {
  it('separa semântica de cargo e área para TI', () => {
    assert.equal(isUserEnabledForArea(users[0], 'TI'), true);
    assert.equal(isUserEnabledForArea(users[1], 'TI'), false);
    assert.equal(isUserEnabledForArea(users[4], 'TI'), false);
    assert.equal(isUserEnabledForArea(users[5], 'TI'), false);
    assert.equal(isUserEnabledForArea(users[6], 'TI'), false);
  });

  it('valida responsáveis de Marketing e Por Fora por cargo primário', () => {
    assert.equal(isUserEnabledForArea(users[1], 'MKT'), true);
    assert.equal(isUserEnabledForArea(users[2], 'PF'), true);
    assert.equal(isUserEnabledForArea(users[0], 'MKT'), false);
    assert.equal(isUserEnabledForArea(users[2], 'TI'), false);
  });

  it('rejeita usuário inativo mesmo com cargo e área corretos', () => {
    assert.equal(isUserEnabledForArea(users[3], 'TI'), false);
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

  it('não grava combinações novas de cargo e área contraditórias silenciosamente', () => {
    assert.deepEqual(normalizeOperationalProfile({ role: 'ti', area: 'TI' }), {
      ok: true,
      role: 'ti',
      area: 'TI',
    });
    assert.deepEqual(normalizeOperationalProfile({ role: 'marketing', area: '' }), {
      ok: true,
      role: 'marketing',
      area: 'MKT',
    });
    assert.deepEqual(normalizeOperationalProfile({ role: 'marketing', area: 'TI' }), {
      ok: false,
      error: 'role_area_mismatch',
    });
  });
});

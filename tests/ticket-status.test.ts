import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextResolvedAt } from '@/lib/ticket-status';

describe('nextResolvedAt', () => {
  const existing = new Date('2024-06-01T12:00:00Z');

  it('define data ao resolver', () => {
    const result = nextResolvedAt('aberto', 'resolvido', null);
    assert.ok(result instanceof Date);
  });

  it('preserva data ao arquivar ticket resolvido', () => {
    const result = nextResolvedAt('resolvido', 'arquivado', existing);
    assert.equal(result, existing);
  });

  it('limpa data ao reabrir', () => {
    const result = nextResolvedAt('resolvido', 'aberto', existing);
    assert.equal(result, null);
  });

  it('mantém null em transições sem resolução', () => {
    const result = nextResolvedAt('em_andamento', 'aguardando', null);
    assert.equal(result, null);
  });
});

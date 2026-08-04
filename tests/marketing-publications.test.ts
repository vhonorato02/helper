import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canTransitionPublication } from '@/lib/integrations/marketing-publications';

describe('marketing publication workflow', () => {
  it('requires review and approval before scheduling', () => {
    assert.equal(canTransitionPublication('draft', 'published'), false);
    assert.equal(canTransitionPublication('draft', 'review'), true);
    assert.equal(canTransitionPublication('review', 'approved'), true);
    assert.equal(canTransitionPublication('approved', 'scheduled'), true);
    assert.equal(canTransitionPublication('scheduled', 'published'), true);
  });

  it('allows failed deliveries to be retried without pretending they were published', () => {
    assert.equal(canTransitionPublication('scheduled', 'failed'), true);
    assert.equal(canTransitionPublication('failed', 'approved'), true);
    assert.equal(canTransitionPublication('failed', 'published'), false);
  });
});

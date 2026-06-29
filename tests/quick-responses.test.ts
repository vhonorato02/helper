import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isQuickResponseAvailableForTicket } from '@/lib/quick-responses';

describe('quick response area scoping', () => {
  it('allows global responses on any ticket area', () => {
    assert.equal(isQuickResponseAvailableForTicket(null, 'TI'), true);
    assert.equal(isQuickResponseAvailableForTicket(null, 'MKT'), true);
    assert.equal(isQuickResponseAvailableForTicket(null, 'PF'), true);
  });

  it('allows only matching area-specific responses', () => {
    assert.equal(isQuickResponseAvailableForTicket('TI', 'TI'), true);
    assert.equal(isQuickResponseAvailableForTicket('TI', 'MKT'), false);
    assert.equal(isQuickResponseAvailableForTicket('MKT', 'PF'), false);
  });
});

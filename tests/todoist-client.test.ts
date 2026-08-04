import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { helperPriorityToTodoist } from '@/lib/integrations/todoist-client';

describe('Todoist mapping', () => {
  it('maps Helper urgency to Todoist API priorities', () => {
    assert.equal(helperPriorityToTodoist('baixa'), 1);
    assert.equal(helperPriorityToTodoist('media'), 2);
    assert.equal(helperPriorityToTodoist('alta'), 3);
    assert.equal(helperPriorityToTodoist('urgente'), 4);
  });
});

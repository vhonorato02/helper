import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractMentions, tokenizeMentions } from '@/lib/mentions';

describe('mention extraction', () => {
  it('returns unique lowercase usernames', () => {
    assert.deepEqual(extractMentions('cc @Ana @bruno @ANA'), ['ana', 'bruno']);
  });

  it('ignores @ inside emails and code', () => {
    // Inline (no leading space) emails should not match: "user@host" starts after a non-space char
    assert.deepEqual(extractMentions('contact: user@host now'), []);
    assert.deepEqual(extractMentions('mailto:foo@example.com'), []);
  });

  it('matches at start of line', () => {
    assert.deepEqual(extractMentions('@ana'), ['ana']);
  });

  it('respects min length', () => {
    assert.deepEqual(extractMentions('@a vs @bo'), ['bo']);
  });
});

describe('mention tokenization', () => {
  it('splits a body into mention and text segments', () => {
    const segments = tokenizeMentions('hello @ana, please look', new Set(['ana']));
    assert.deepEqual(segments, [
      { type: 'text', value: 'hello ' },
      { type: 'mention', value: 'ana' },
      { type: 'text', value: ', please look' },
    ]);
  });

  it('ignores mentions that are not in the whitelist', () => {
    const segments = tokenizeMentions('cc @ghost', new Set(['ana']));
    assert.deepEqual(segments, [{ type: 'text', value: 'cc @ghost' }]);
  });
});

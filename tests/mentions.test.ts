import { describe, expect, it } from 'vitest';
import { extractMentions, tokenizeMentions } from '@/lib/mentions';

describe('mention extraction', () => {
  it('returns unique lowercase usernames', () => {
    expect(extractMentions('cc @Ana @bruno @ANA')).toEqual(['ana', 'bruno']);
  });

  it('ignores @ inside emails and code', () => {
    // Inline (no leading space) emails should not match: "user@host" starts after a non-space char
    expect(extractMentions('contact: user@host now')).toEqual([]);
    expect(extractMentions('mailto:foo@example.com')).toEqual([]);
  });

  it('matches at start of line', () => {
    expect(extractMentions('@ana')).toEqual(['ana']);
  });

  it('respects min length', () => {
    expect(extractMentions('@a vs @bo')).toEqual(['bo']);
  });
});

describe('mention tokenization', () => {
  it('splits a body into mention and text segments', () => {
    const segments = tokenizeMentions('hello @ana, please look', new Set(['ana']));
    expect(segments).toEqual([
      { type: 'text', value: 'hello ' },
      { type: 'mention', value: 'ana' },
      { type: 'text', value: ', please look' },
    ]);
  });

  it('ignores mentions that are not in the whitelist', () => {
    const segments = tokenizeMentions('cc @ghost', new Set(['ana']));
    expect(segments).toEqual([{ type: 'text', value: 'cc @ghost' }]);
  });
});

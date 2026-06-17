import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { logger } from '@/lib/logger';

describe('structured logger', () => {
  it('redacts sensitive fields and bearer values before writing', () => {
    const sink = console;
    const originalError = sink.error;
    let output = '';
    sink.error = (...args: unknown[]) => {
      output = args.map(String).join(' ');
    };

    try {
      logger.warn('redaction_test', {
        authToken: 'pretend-token-value',
        nested: { password: 'pretend-password-value' },
        error: new Error('Request failed with Bearer pretend-bearer-value'),
      });
    } finally {
      sink.error = originalError;
    }

    assert.match(output, /redaction_test/);
    assert.match(output, /\[REDACTED\]/);
    assert.doesNotMatch(output, /pretend-token-value/);
    assert.doesNotMatch(output, /pretend-password-value/);
    assert.doesNotMatch(output, /pretend-bearer-value/);
  });

  it('serializes circular fields without throwing', () => {
    const sink = console;
    const originalLog = sink.log;
    let output = '';
    sink.log = (...args: unknown[]) => {
      output = args.map(String).join(' ');
    };

    type CircularField = { name: string; self?: CircularField };
    const circular: CircularField = { name: 'loop' };
    circular.self = circular;

    try {
      logger.info('circular_test', { circular });
    } finally {
      sink.log = originalLog;
    }

    assert.match(output, /circular_test/);
    assert.match(output, /\[Circular\]/);
  });
});
